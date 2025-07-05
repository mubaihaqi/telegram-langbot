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
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) {
        console.error("Error fetching question:", error);
        await sendMessage(
          chatId,
          "Maaf, terjadi masalah saat mengambil soal latihan. Silakan coba lagi nanti."
        );
        return res.status(200).send("OK");
      }

      if (!questions || questions.length === 0) {
        await sendMessage(
          chatId,
          "Maaf, belum ada soal tersedia untuk latihan saat ini."
        );
        return res.status(200).send("OK");
      }

      const question = questions[0];

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

  return res.status(200).send("OK");
}
