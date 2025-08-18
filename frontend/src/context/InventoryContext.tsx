"use client"

import React, { createContext, useContext, useState } from 'react'
import { ethers } from 'ethers'

interface InventoryContextType {
    contract: ethers.Contract | null
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

interface InventoryProviderProps {
    children: React.ReactNode
    contract?: ethers.Contract | null
}

export function InventoryProvider({ children, contract }: InventoryProviderProps) {
    const value: InventoryContextType = {
        contract: contract || null
    }

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    )
}

export function useInventoryContext() {
    const context = useContext(InventoryContext)
    if (context === undefined) {
        throw new Error('useInventoryContext must be used within an InventoryProvider')
    }
    return context
}
