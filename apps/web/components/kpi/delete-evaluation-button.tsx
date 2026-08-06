'use client'

/**
 * 상세 화면의 삭제 버튼.
 *
 * 빨강 색만으로 위험을 표현하지 않고 확인 대화상자로 이중 확인한다(screen-behavior.md).
 * 소프트 삭제이므로 데이터는 남지만 화면에서는 사라진다.
 */

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteKpiEvaluationAction } from '@/app/kpi/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function DeleteEvaluationButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await deleteKpiEvaluationAction(id)
      if (result.ok) {
        setOpen(false)
        toast.success(`${name}의 KPI를 삭제했습니다.`)
        router.push('/kpi')
        return
      }
      setOpen(false)
      // 이미 삭제된 대상이면 목록으로 보낸다(③: 폼/화면을 유지하지 않는다)
      toast.error(result.error.code === 'NOT_FOUND' ? result.error.message : '삭제에 실패했습니다.')
      router.push('/kpi')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="lg" data-testid="delete-trigger">
            삭제
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>KPI를 삭제할까요?</DialogTitle>
          <DialogDescription>
            {name}의 KPI 평가를 삭제합니다. 목록과 상세에서 더 이상 보이지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">취소</Button>} />
          <Button variant="destructive" onClick={confirm} disabled={pending} data-testid="delete-confirm">
            {pending ? '삭제 중…' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
