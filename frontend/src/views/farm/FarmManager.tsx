"use client"

import React from 'react'
import { ethers } from 'ethers'
import { PlotManager } from '@/views/plot/PlotManager'

interface FarmManagerProps {
    signer?: ethers.Signer | null
}

export default function FarmManager({ signer }: FarmManagerProps) {
    return (
        <div className="space-y-6">
            <PlotManager signer={signer} />
        </div>
    )
}
