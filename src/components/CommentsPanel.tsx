import { demoComments } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type CommentsPanelProps = {
  title?: string;
};

export function CommentsPanel({ title = "User comments" }: CommentsPanelProps) {
  return (
    <Card className="bg-[#111a27] border-white/10">
      <CardContent className="p-6 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="space-y-3">
          {demoComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-white/10 bg-[#0b1320] p-4"
            >
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>@{comment.user}</span>
                <span>{comment.time}</span>
              </div>
              <div className="mt-2 text-sm text-white">{comment.message}</div>
              <div className="mt-2 inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                {comment.tag}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Input
            placeholder="What’s your prediction?"
            className="bg-[#0b1320] border-white/10 text-white placeholder:text-white/40"
          />
          <Button className="bg-[#2d7ff9] hover:bg-[#3a8bff] text-white">
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
