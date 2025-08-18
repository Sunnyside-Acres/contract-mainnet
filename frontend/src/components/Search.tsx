import * as React from "react"
import { Search as SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchProps {
    placeholder?: string
    value: string
    onSearch: (value: string) => void
    className?: string
}

export function Search({ placeholder = "Search...", value, onSearch, className }: SearchProps) {
    return (
        <div className={`relative ${className}`}>
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-8"
            />
        </div>
    )
}
