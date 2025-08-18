import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DeploymentLogsProps {
    logs: string[];
    className?: string;
}

export function DeploymentLogs({ logs, className }: DeploymentLogsProps) {
    return (
        <ScrollArea className={cn("h-[400px] w-full rounded-md border p-4", className)}>
            <div className="space-y-1">
                {logs.map((log, index) => {
                    // Determine log type based on content
                    const isSuccess = log.includes("✅");
                    const isError = log.includes("❌");
                    const isInfo = log.includes("📝") || log.includes("🌐") || log.includes("💰");
                    const isDeploying = log.includes("📦");
                    const isConfig = log.includes("⚙️");
                    const isSummary = log.includes("📋");
                    const isSaved = log.includes("💾");
                    const isComplete = log.includes("🎉");

                    return (
                        <pre
                            key={index}
                            className={cn(
                                "text-sm font-mono whitespace-pre-wrap",
                                isSuccess && "text-green-500",
                                isError && "text-red-500",
                                isInfo && "text-blue-500",
                                isDeploying && "text-purple-500",
                                isConfig && "text-yellow-500",
                                isSummary && "text-cyan-500",
                                isSaved && "text-emerald-500",
                                isComplete && "text-pink-500"
                            )}
                        >
                            {log}
                        </pre>
                    );
                })}
            </div>
        </ScrollArea>
    );
}