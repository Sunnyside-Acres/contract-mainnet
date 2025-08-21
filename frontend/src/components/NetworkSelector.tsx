'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface NetworkSelectorProps {
  selectedNetwork: string
  onNetworkChange: (network: string) => void
}

const networks = [
  { id: 'hardhat', name: 'Local (Hardhat)', icon: '🔧', description: 'Local development network' },
  { id: 'seitestnet', name: 'Sei Testnet', icon: '🧪', description: 'Sei test network' },
  { id: 'seimainnet', name: 'Sei Mainnet', icon: '🌐', description: 'Sei main network' }
]

export function NetworkSelector({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) {
  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span>{currentNetwork.icon}</span>
          <span className="hidden sm:inline">{currentNetwork.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => onNetworkChange(network.id)}
            className={`flex items-center gap-3 p-3 ${selectedNetwork === network.id ? 'bg-accent' : ''}`}
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{network.icon}</span>
              <div className="flex flex-col">
                <span className="font-medium">{network.name}</span>
                <span className="text-xs text-muted-foreground">{network.description}</span>
              </div>
            </div>
            {selectedNetwork === network.id && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
