"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, BanknoteIcon, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { RippleButton } from "@/components/ripple-button"
import { getPaymentInfo } from "@/utils/payment"
import { useRouter } from "next/navigation"
import { saveGifting } from "@/app/actions/gifting-actions"
import { getUserSession } from "@/utils/auth"
import { useToast } from "@/hooks/use-toast"

interface ConfirmPageProps {
  params: {
    id: string
    performerId: string
  }
}

export default function ConfirmPage({ params }: ConfirmPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const eventId = Number.parseInt(params.id)
  const performerId = Number.parseInt(params.performerId)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [paymentInfo, setPaymentInfo] = useState<{
    performerName: string
    amount: string
    comment: string
  } | null>(null)

  useEffect(() => {
    // 支払い情報を取得
    const info = getPaymentInfo()
    if (info) {
      setPaymentInfo({
        performerName: info.performerName,
        amount: info.amount,
        comment: info.comment,
      })
    } else {
      // 支払い情報がない場合は前のページに戻る
      router.push(`/events/${eventId}/performers/${performerId}`)
    }
  }, [eventId, performerId, router])

  const handleConfirm = async () => {
    if (isSubmitting) return // 二重送信防止
    setIsSubmitting(true)

    try {
      // ユーザーセッションを取得
      const session = getUserSession()
      if (!session) {
        toast({
          title: "エラー",
          description: "ログインが必要です",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      // イベント情報を取得（実際のアプリではAPIから取得するか、状態管理で保持する）
      const events = {
        "1": { id: 1, title: "サマーフェス2025" },
        "2": { id: 2, title: "5周年ライブin横アリ" },
        "3": { id: 3, title: "生誕祭2025" },
        "4": { id: 4, title: "ウィンターライブ2024" },
      }
      const event = events[params.id as keyof typeof events] || { id: eventId, title: "イベント" }

      if (paymentInfo) {
        // ギフティングデータを保存
        const result = await saveGifting({
          user_id: session.email,
          user_name: session.name,
          artist_id: `artist-${performerId}`, // 実際のアプリではアーティストの実際のIDを使用
          artist_name: paymentInfo.performerName,
          event_id: eventId,
          event_name: event.title,
          amount: Number.parseInt(paymentInfo.amount),
          comment: paymentInfo.comment || undefined,
        })

        if (!result.success) {
          toast({
            title: "エラー",
            description: result.error || "ギフティングの保存に失敗しました",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        // 完了画面に遷移する前に少し遅延を入れる
        setTimeout(() => {
          // 完了画面に遷移
          const thanksUrl = `/events/${eventId}/performers/${performerId}/thanks`
          console.log("Navigating to:", thanksUrl)
          router.push(thanksUrl)
        }, 500)
      }
    } catch (error) {
      console.error("Error saving gifting:", error)
      toast({
        title: "エラー",
        description: "ギフティングの処理中にエラーが発生しました",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  if (!paymentInfo) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center mb-2">
        <Link href={`/events/${eventId}/performers/${performerId}`}>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold ml-1">ギフティング確認</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-md transform scale-110" />
                <CheckCircle className="h-12 w-12 text-primary relative z-10" />
              </div>
            </div>

            <h2 className="text-center text-lg font-bold">ギフティング内容の確認</h2>
            <p className="text-center text-sm text-muted-foreground">
              以下の内容でギフティングを送信します。よろしければ「ギフティングする」ボタンを押してください。
            </p>

            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">出演者</span>
                <span className="font-medium">{paymentInfo.performerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">金額</span>
                <div className="flex items-center gap-1">
                  <BanknoteIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{Number.parseInt(paymentInfo.amount).toLocaleString()}円</span>
                </div>
              </div>
              {paymentInfo.comment && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">コメント</span>
                  <p className="text-sm bg-white/50 p-3 rounded">{paymentInfo.comment}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-4 bg-muted/20 border-t">
            <RippleButton
              onClick={handleConfirm}
              className="w-full gap-1 rounded-full h-9 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "処理中..." : "ギフティングする"}
            </RippleButton>
            <Link href={`/events/${eventId}/performers/${performerId}`} className="w-full">
              <Button variant="outline" className="w-full rounded-full text-sm h-9">
                修正する
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
