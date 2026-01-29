import Link from "next/link";
import { demoComments } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type CommentsPanelProps = {
  title?: string;
};

export function CommentsPanel({ title = "User comments" }: CommentsPanelProps) {
  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
      <CardContent className="p-6 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="space-y-3">
          {demoComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
            >
              <div className="flex items-center justify-between text-xs text-[color:var(--text-subtle)]">
                <Link
                  href={`/u/${comment.user.toLowerCase()}`}
                  className="hover:text-blue-500 transition"
                >
                  @{comment.user}
                </Link>
                <span>{comment.time}</span>
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-strong)]">
                {comment.message}
              </div>
              <div className="mt-2 inline-flex items-center rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-muted)]">
                {comment.tag}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Input
            placeholder="What's your prediction?"
            className="bg-[color:var(--surface-2)] border-[color:var(--border-soft)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-subtle)]"
          />
          <Button className="bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white">
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
