import { db, MEAL_BUCKET } from "@/lib/supabase/client";

/** Upload a meal photo and return a public URL (bucket must be public). */
export async function uploadMealPhoto(
  userId: string,
  buffer: Buffer,
  mediaType = "image/jpeg",
): Promise<string | null> {
  try {
    const ext = mediaType.includes("png") ? "png" : "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const supa = db();
    const { error } = await supa.storage.from(MEAL_BUCKET).upload(path, buffer, {
      contentType: mediaType,
      upsert: false,
    });
    if (error) {
      console.error("uploadMealPhoto failed", error.message);
      return null;
    }
    const { data } = supa.storage.from(MEAL_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadMealPhoto error", e);
    return null;
  }
}
