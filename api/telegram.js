import supabase from "../lib/db"; // Import instance Supabase dari db.js

async function sendMessage(chatId, text, replyMarkup = null) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error sending message:", data);
    }
  } catch (error) {
    console.error("Network error sending message:", error);
  }
}

// Main handler untuk Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { message } = req.body;

  if (!message) {
    return res.status(200).send("OK");
  }

  const chatId = message.chat.id;
  const text = message.text ? message.text.trim() : "";
  const fromUser = message.from;

  console.log(
    `Received message from ${
      fromUser.username || fromUser.first_name
    } (${chatId}): "${text}"`
  );

  // /start
  if (text === "/start") {
    try {
      // Cek apakah user sudah ada di database
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", chatId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking user:", fetchError);
        await sendMessage(
          chatId,
          "Terjadi kesalahan internal saat memeriksa data kamu."
        );
        return res.status(200).send("OK");
      }

      if (!existingUser) {
        // Jika user belum ada, simpan data user baru
        const { error: insertError } = await supabase.from("users").insert({
          telegram_id: chatId,
          username: fromUser.username,
          first_name: fromUser.first_name,
        });

        if (insertError) {
          console.error("Error saving new user:", insertError);
          await sendMessage(
            chatId,
            "Gagal menyimpan data kamu. Silakan coba lagi nanti."
          );
          return res.status(200).send("OK");
        }
        await sendMessage(
          chatId,
          `Halo, ${fromUser.first_name}! Selamat datang di bot latihan bahasa Inggris. Ketik /help untuk melihat perintah yang tersedia.`
        );
        console.log(
          `New user registered: ${fromUser.username || fromUser.first_name}`
        );
      } else {
        // Jika user sudah ada
        await sendMessage(
          chatId,
          `Selamat datang kembali, ${fromUser.first_name}! Ketik /help untuk melihat perintah yang tersedia.`
        );
      }
    } catch (error) {
      console.error("Unhandled error in /start:", error);
      await sendMessage(chatId, "Terjadi kesalahan tak terduga.");
    }
  }
  // /help
  else if (text === "/help") {
    const helpMessage = `
Halo! Saya adalah bot latihan bahasa Inggris kamu. Berikut adalah perintah yang bisa kamu gunakan:

📖 /latihan - Mulai latihan soal acak.
🎯 /tema [nama_tema] - Latihan soal berdasarkan tema tertentu (contoh: /tema makanan, /tema travel, /tema dasar).
📅 /daily - Ikuti tantangan harian (5 soal berurutan).
📊 /status - Cek progres, XP, dan level kamu.
❓ /help - Menampilkan daftar perintah ini.

Semoga berhasil!
    `.trim();
    await sendMessage(chatId, helpMessage);
  }

  // /latihan
  else if (text === "/latihan") {
    try {
      // Ambil semua ID soal yang tersedia
      const { data: allQuestionIds, error: idError } = await supabase
        .from("questions")
        .select("id"); // Hanya ambil kolom ID

      if (idError) {
        console.error("Error fetching question IDs:", idError);
        await sendMessage(
          chatId,
          "Maaf, terjadi masalah saat mengambil daftar soal. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      if (!allQuestionIds || allQuestionIds.length === 0) {
        await sendMessage(
          chatId,
          "Maaf, belum ada soal tersedia untuk latihan saat ini."
        );
        return res.status(200).send("OK");
      }

      // Pilih satu ID secara acak dari daftar yang ada
      const randomIndex = Math.floor(Math.random() * allQuestionIds.length);
      const randomQuestionId = allQuestionIds[randomIndex].id;

      // Ambil detail soal berdasarkan ID acak tersebut
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", randomQuestionId)
        .single(); // Gunakan single() karena kita hanya butuh 1 soal

      if (questionError || !question) {
        console.error(
          "Error fetching specific random question:",
          questionError
        );
        await sendMessage(
          chatId,
          "Maaf, terjadi masalah saat mengambil soal latihan. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ current_question_id: question.id })
        .eq("telegram_id", chatId);

      if (updateError) {
        console.error("Error saving user state for question:", updateError);
        await sendMessage(
          chatId,
          "Terjadi masalah saat menyiapkan soal. Silakan coba lagi."
        );
        return res.status(200).send("OK");
      }

      const optionsText = question.options
        .map((opt, idx) => {
          return `${String.fromCharCode(97 + idx)}. ${opt}`;
        })
        .join("\n");

      const questionMessage = `Pertanyaan:
${question.question}

Pilihan Jawaban:
${optionsText}

Ketik jawaban Anda (a, b, c, atau d).
`.trim();
      await sendMessage(chatId, questionMessage);
    } catch (error) {
      console.error("Unhandled error in /latihan:", error);
      await sendMessage(
        chatId,
        "Terjadi kesalahan tak terduga saat memulai latihan."
      );
    }
  }

  // /tema [nama_tema]
  else if (text.startsWith("/tema ")) {
    const theme = text.substring(6).trim().toLowerCase(); // Ambil nama tema dari pesan
    if (!theme) {
      await sendMessage(
        chatId,
        "Gunakan format: /tema [nama_tema]. Contoh: /tema makanan atau /tema travel"
      );
      return res.status(200).send("OK");
    }

    try {
      // 1. Ambil semua ID soal dari tema tertentu
      const { data: themedQuestionIds, error: idError } = await supabase
        .from("questions")
        .select("id")
        .eq("theme", theme); // Filter berdasarkan tema

      if (idError) {
        console.error(
          `Error fetching themed question IDs for ${theme}:`,
          idError
        );
        await sendMessage(
          chatId,
          `Maaf, terjadi masalah saat mengambil soal tema "${theme}". Silakan coba lagi nanti.`
        );
        return res.status(200).send("OK");
      }

      if (!themedQuestionIds || themedQuestionIds.length === 0) {
        await sendMessage(
          chatId,
          `Maaf, belum ada soal tersedia untuk tema "<b>${theme}</b>". Coba tema lain seperti 'makanan', 'travel', atau 'dasar'.`
        );
        return res.status(200).send("OK");
      }

      // Pilih satu ID secara acak dari daftar yang bertema
      const randomIndex = Math.floor(Math.random() * themedQuestionIds.length);
      const randomQuestionId = themedQuestionIds[randomIndex].id;

      // Ambil detail soal berdasarkan ID acak tersebut
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", randomQuestionId)
        .single();

      if (questionError || !question) {
        console.error(
          `Error fetching specific themed question for ${theme}:`,
          questionError
        );
        await sendMessage(
          chatId,
          `Maaf, terjadi masalah saat mengambil soal tema "${theme}". Silakan coba lagi nanti.`
        );
        return res.status(200).send("OK");
      }

      // Simpan state user (soal yang sedang dijawab)
      const { error: updateError } = await supabase
        .from("users")
        .update({ current_question_id: question.id })
        .eq("telegram_id", chatId);

      if (updateError) {
        console.error(
          "Error saving user state for themed question:",
          updateError
        );
        await sendMessage(
          chatId,
          "Terjadi masalah saat menyiapkan soal tema. Silakan coba lagi."
        );
        return res.status(200).send("OK");
      }

      // Kirim pertanyaan dan pilihan jawaban
      const optionsText = question.options
        .map((opt, idx) => {
          return `${String.fromCharCode(97 + idx)}. ${opt}`;
        })
        .join("\n");

      const questionMessage = `
Pertanyaan tema ${theme}:
${question.question}

Pilihan Jawaban:
${optionsText}

Ketik jawaban Anda (a, b, c, atau d).
`.trim();
      await sendMessage(chatId, questionMessage);
    } catch (error) {
      console.error("Unhandled error in /tema:", error);
      await sendMessage(
        chatId,
        "Terjadi kesalahan tak terduga saat memulai latihan tema."
      );
    }
  }

  // /daily
  else if (text === "/daily") {
    try {
      // 1. Ambil data user
      const { data: user, error: userFetchError } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", chatId)
        .single();

      if (userFetchError || !user) {
        console.error("Error fetching user for daily:", userFetchError);
        await sendMessage(
          chatId,
          "Maaf, terjadi kesalahan saat mengambil data Anda. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      // Dapatkan tanggal hari ini (UTC untuk konsistensi)
      const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
      const lastDailyDate = user.last_daily;

      if (lastDailyDate === today) {
        // User sudah ikut tantangan harian hari ini
        await sendMessage(
          chatId,
          "Anda sudah mengikuti tantangan harian hari ini. Silakan kembali besok untuk tantangan baru!"
        );
        return res.status(200).send("OK");
      }

      // 2. Jika belum ikut, ambil 5 soal acak
      // Seperti sebelumnya, kita akan ambil semua ID, lalu pilih 5 secara acak
      const { data: allQuestionIds, error: idError } = await supabase
        .from("questions")
        .select("id");

      if (idError) {
        console.error("Error fetching question IDs for daily:", idError);
        await sendMessage(
          chatId,
          "Maaf, terjadi masalah saat menyiapkan tantangan harian. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      if (!allQuestionIds || allQuestionIds.length < 5) {
        await sendMessage(
          chatId,
          "Maaf, belum ada cukup soal tersedia untuk tantangan harian (minimal 5 soal diperlukan)."
        );
        return res.status(200).send("OK");
      }

      // Pilih 5 ID unik secara acak
      const selectedQuestionIds = [];
      const availableIndices = Array.from(
        { length: allQuestionIds.length },
        (_, i) => i
      ); // [0, 1, 2, ..., n-1]

      for (let i = 0; i < 5; i++) {
        if (availableIndices.length === 0) break; // Jika soal tidak cukup, hentikan
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const questionIndex = availableIndices.splice(randomIndex, 1)[0]; // Ambil dan hapus dari array
        selectedQuestionIds.push(allQuestionIds[questionIndex].id);
      }

      if (selectedQuestionIds.length < 5) {
        await sendMessage(
          chatId,
          "Maaf, tidak dapat memilih 5 soal unik. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      // 3. Simpan state sesi daily ke user
      const { error: updateDailyStateError } = await supabase
        .from("users")
        .update({
          daily_question_ids: selectedQuestionIds, // Simpan array ID soal
          daily_current_index: 0, // Mulai dari soal pertama (indeks 0)
          // last_daily: tidak diupdate di sini, hanya setelah sesi selesai/di hari berikutnya
        })
        .eq("telegram_id", chatId);

      if (updateDailyStateError) {
        console.error(
          "Error updating daily state for user:",
          updateDailyStateError
        );
        await sendMessage(
          chatId,
          "Terjadi masalah saat memulai tantangan harian. Silakan coba lagi."
        );
        return res.status(200).send("OK");
      }

      // 4. Ambil soal pertama dari sesi daily dan kirimkan
      const firstQuestionId = selectedQuestionIds[0];
      const { data: firstQuestion, error: firstQuestionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", firstQuestionId)
        .single();

      if (firstQuestionError || !firstQuestion) {
        console.error(
          "Error fetching first daily question:",
          firstQuestionError
        );
        await sendMessage(
          chatId,
          "Maaf, soal pertama tantangan harian tidak ditemukan. Silakan mulai ulang."
        );
        // Reset daily state jika ada masalah
        await supabase
          .from("users")
          .update({ daily_question_ids: null, daily_current_index: null })
          .eq("telegram_id", chatId);
        return res.status(200).send("OK");
      }

      const optionsText = firstQuestion.options
        .map((opt, idx) => {
          return `${String.fromCharCode(97 + idx)}. ${opt}`;
        })
        .join("\n");

      const dailyQuestionMessage = `
Tantangan Harian (${user.daily_current_index + 1}/5):
${firstQuestion.question}

Pilihan Jawaban:
${optionsText}

Ketik jawaban Anda (a, b, c, atau d).
`.trim();
      await sendMessage(chatId, dailyQuestionMessage);
    } catch (error) {
      console.error("Unhandled error in /daily start:", error);
      await sendMessage(
        chatId,
        "Terjadi kesalahan tak terduga saat memulai tantangan harian."
      );
    }
  }

  // Jika bukan perintah yang dikenal, asumsikan ini adalah jawaban
  else {
    try {
      // 1. Ambil state user (terutama current_question_id)
      const { data: user, error: userFetchError } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", chatId)
        .single();

      if (userFetchError || !user) {
        console.error(
          "Error fetching user for answer evaluation:",
          userFetchError
        );
        await sendMessage(
          chatId,
          "Maaf, saya tidak dapat menemukan sesi latihan Anda. Silakan mulai ulang dengan /latihan."
        );
        return res.status(200).send("OK");
      }

      if (!user.current_question_id) {
        // User tidak sedang dalam sesi latihan aktif, abaikan atau beri info
        await sendMessage(
          chatId,
          "Saya tidak mengerti perintah Anda. Silakan ketik /help untuk melihat daftar perintah, atau /latihan untuk mulai belajar!"
        );
        return res.status(200).send("OK");
      }

      // 2. Ambil detail soal yang sedang dijawab
      const { data: question, error: questionFetchError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", user.current_question_id)
        .single();

      if (questionFetchError || !question) {
        console.error(
          "Error fetching question for evaluation:",
          questionFetchError
        );
        await sendMessage(
          chatId,
          "Maaf, soal yang sedang Anda jawab tidak ditemukan. Silakan mulai latihan baru dengan /latihan."
        );
        // Reset current_question_id jika soal tidak ditemukan
        await supabase
          .from("users")
          .update({ current_question_id: null })
          .eq("telegram_id", chatId);
        return res.status(200).send("OK");
      }

      // 3. Evaluasi Jawaban
      const userAnswer = text.toLowerCase().trim(); // Jadikan lowercase untuk perbandingan
      const correctAnswerIndex = question.answer_idx;
      const isCorrect =
        userAnswer === String.fromCharCode(97 + correctAnswerIndex);

      let feedbackMessage = "";
      let newXp = user.xp;
      let newCorrectCount = user.correct_count;
      let newWrongCount = user.wrong_count;

      if (isCorrect) {
        newXp += 10; // Tambah XP
        newCorrectCount += 1;
        feedbackMessage = `🎉 Benar sekali! Jawaban Anda tepat. Anda mendapatkan <b>10 XP</b>.\n\n${
          question.explanation ? "Penjelasan: " + question.explanation : ""
        }`;
      } else {
        newWrongCount += 1;
        // Dapatkan huruf jawaban yang benar untuk feedback
        const correctOptionLetter = String.fromCharCode(
          97 + correctAnswerIndex
        );
        const correctOptionText = question.options[correctAnswerIndex];

        feedbackMessage = `😔 Salah. Jawaban yang benar adalah <b>${correctOptionLetter}. ${correctOptionText}</b>.\n\n${
          question.explanation
            ? "Penjelasan: " + question.explanation
            : "Tidak ada penjelasan tambahan."
        }`;
      }

      // Hitung level baru
      const newLevel = Math.floor(newXp / 100) + 1; // Rumus level: floor(XP / 100) + 1

      // 4. Update data user di database
      const { error: updateStatsError } = await supabase
        .from("users")
        .update({
          xp: newXp,
          level: newLevel,
          correct_count: newCorrectCount,
          wrong_count: newWrongCount,
          current_question_id: null,
        })
        .eq("telegram_id", chatId);

      if (updateStatsError) {
        console.error("Error updating user stats:", updateStatsError);
        await sendMessage(
          chatId,
          "Terjadi masalah saat menyimpan progres Anda."
        );
        return res.status(200).send("OK");
      }

      // 5. Kirim feedback ke user
      await sendMessage(chatId, feedbackMessage);

      // Opsional: Langsung tawarkan latihan lagi
      await sendMessage(
        chatId,
        "\nKetik /latihan untuk soal berikutnya, atau /help untuk melihat perintah."
      );
    } catch (error) {
      console.error("Unhandled error in answer evaluation:", error);
      await sendMessage(
        chatId,
        "Terjadi kesalahan tak terduga saat mengevaluasi jawaban Anda."
      );
    }
  }

  return res.status(200).send("OK");
}
