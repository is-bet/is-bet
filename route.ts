import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { eventId, result } = await req.json()

  // 1. 이벤트 가져오기
  const { data: event } = await supabase
    .from("betting_events")
    .select("*")
    .eq("id", eventId)
    .single()

  if (!event) return NextResponse.json({ error: "이벤트 없음" })

  // 2. 배팅 목록 가져오기
  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("event_id", eventId)

  if (!bets) return NextResponse.json({ error: "배팅 없음" })

  for (const bet of bets) {
    const isWin = bet.selected_option === result

    // 승리하면 2배 지급
    if (isWin) {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", bet.user_id)
        .single()

      await supabase
        .from("users")
        .update({
          virtual_money: user.virtual_money + bet.amount * 2,
        })
        .eq("id", bet.user_id)
    }

    // 배팅 결과 업데이트
    await supabase
      .from("bets")
      .update({ is_win: isWin })
      .eq("id", bet.id)
  }

  // 이벤트 상태 변경
  await supabase
    .from("betting_events")
    .update({
      status: "settled",
      result,
    })
    .eq("id", eventId)

  return NextResponse.json({ success: true })
}