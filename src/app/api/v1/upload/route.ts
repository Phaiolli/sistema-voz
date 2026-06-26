import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

const BUCKET = "voz-assets";
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: { code: "NO_FILE", message: "Campo 'file' obrigatório." } }, { status: 422 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: { code: "INVALID_TYPE", message: "Apenas imagens são permitidas." } }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "TOO_LARGE", message: "Imagem deve ter no máximo 3 MB." } }, { status: 422 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const supabase = createServerClient();

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
