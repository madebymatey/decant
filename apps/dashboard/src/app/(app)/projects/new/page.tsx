import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { requireUser } from "@/lib/guards"
import { NewProjectForm } from "./NewProjectForm"

export const dynamic = "force-dynamic"

export default async function NewProjectPage() {
  await requireUser()
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} />
        Projects
      </Link>
      <h1 className="mb-6 text-lg font-semibold tracking-tight">New project</h1>
      <NewProjectForm />
    </div>
  )
}
