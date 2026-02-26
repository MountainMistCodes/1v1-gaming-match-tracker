import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function POST() {
  revalidateTag("leaderboard", "max")
  revalidatePath("/", "page")
  revalidatePath("/leaderboard", "page")
  return NextResponse.json({ revalidated: true, tag: "leaderboard", paths: ["/", "/leaderboard"] })
}
