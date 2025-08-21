'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import ContractManager from '@/components/ContractManager'
import ContractFunctions from '@/components/ContractFunctions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useWallet } from '@/context/WalletContext'
import { NetworkSelector } from '@/components/NetworkSelector'

export default function Home() {
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [selectedContractName, setSelectedContractName] = useState<string>('')
  const [artifacts, setArtifacts] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [account, setAccount] = useState<string>('')
  const [copyingABI, setCopyingABI] = useState<string | null>(null)
  const { signer, selectedNetwork, setSelectedNetwork } = useWallet()

  // Load contract addresses dựa trên network được chọn
  const { addresses: contractAddresses, loading: addressesLoading, error: addressesError } = useContractAddresses(selectedNetwork)

  // Debug logging
  useEffect(() => {
    console.log('Selected network:', selectedNetwork)
    console.log('Contract addresses:', contractAddresses)
    console.log('Addresses loading:', addressesLoading)
    console.log('Addresses error:', addressesError)
  }, [selectedNetwork, contractAddresses, addressesLoading, addressesError])

  // Load artifacts on mount
  useEffect(() => {
    loadArtifacts()
  }, [])

  // Get account address from signer
  useEffect(() => {
    const getAccount = async () => {
      if (signer) {
        try {
          const address = await signer.getAddress()
          setAccount(address)
        } catch (error) {
          console.error('Error getting account:', error)
          setAccount('')
        }
      } else {
        setAccount('')
      }
    }
    getAccount()
  }, [signer])

  const loadArtifacts = async () => {
    try {
      console.log('Loading artifacts...')
      const response = await fetch('/api/artifacts')
      if (!response.ok) {
        throw new Error('Lỗi tải artifacts')
      }
      const artifactsData = await response.json()
      console.log('Loaded artifacts:', Object.keys(artifactsData))
      setArtifacts(artifactsData)
    } catch (error) {
      console.error('Lỗi tải artifacts:', error)
    }
  }

  const handleContractLoad = (contract: ethers.Contract | null, contractName?: string) => {
    setContract(contract)
    setSelectedContractName(contractName || '')
  }

  const loadContract = async (contractName: string) => {
    console.log('Loading contract:', contractName)
    console.log('Signer:', signer)
    console.log('Contract addresses:', contractAddresses)
    console.log('Available artifacts:', Object.keys(artifacts))

    if (!signer) {
      console.error('Vui lòng kết nối ví trước')
      return
    }

    const contractAddress = contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts]
    console.log('Contract address for', contractName, ':', contractAddress)

    if (!contractAddress) {
      console.error('Không tìm thấy địa chỉ contract:', contractName)
      return
    }

    if (!artifacts[contractName]?.abi) {
      console.error('Không tìm thấy ABI cho contract:', contractName)
      console.log('Available artifacts:', Object.keys(artifacts))
      console.log('Looking for:', contractName)
      return
    }

    try {
      setIsLoading(true)
      const contract = new ethers.Contract(contractAddress, artifacts[contractName].abi, signer)
      setContract(contract)
      setSelectedContractName(contractName)
      console.log('Contract loaded:', contractName)
    } catch (error) {
      console.error('Lỗi tải contract:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyABI = async (contractName: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!artifacts[contractName]?.abi) {
      console.error('Không tìm thấy ABI cho contract:', contractName)
      return
    }

    try {
      setCopyingABI(contractName)
      const abiString = JSON.stringify(artifacts[contractName].abi, null, 2)
      await navigator.clipboard.writeText(abiString)

      // Reset copying state after 1 second
      setTimeout(() => {
        setCopyingABI(null)
      }, 1000)
    } catch (error) {
      console.error('Lỗi copy ABI:', error)
      setCopyingABI(null)
    }
  }

  // Group contracts by feature
  const contractGroups = {
    Core: ['World'],
    Player: ['PlayerComponent', 'PlayerLogic', 'PlayerProxy'],
    Item: ['ItemComponent', 'ItemLogic', 'ItemProxy'],
    Weather: ['WeatherComponent', 'WeatherLogic', 'WeatherProxy'],
    Plot: ['PlotComponent', 'PlotLogic', 'PlotProxy'],
    Inventory: ['InventoryComponent', 'InventoryLogic', 'InventoryProxy'],
    Plant: ['PlantComponent', 'PlantLogic', 'PlantProxy'],
    Fishing: ['FishingLogic'],
    NPCMarket: ['NPCMarketComponent', 'NPCMarketLogic', 'NPCMarketProxy']
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">Contract Explorer</h1>
            <p className="text-indigo-700 dark:text-indigo-300 mt-1">
              Khám phá và tương tác với smart contracts của Sunnyside Acres
            </p>
          </div>
          <div className="flex items-center gap-4">
            {account && (
              <div className="text-right">
                <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Connected</div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
            )}
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
            />
          </div>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Left Column - Contract Selection */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contracts</h2>
                <div className="flex items-center gap-2">
                  {addressesLoading && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                      Loading...
                    </Badge>
                  )}
                  {addressesError && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                      Error
                    </Badge>
                  )}
                  {contractAddresses && (
                    <Badge variant="outline" className="text-xs">
                      {Object.values(contractAddresses.contracts).filter(Boolean).length}
                    </Badge>
                  )}
                  {artifacts && Object.keys(artifacts).length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(artifacts).length} ABIs
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!signer && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-800">Kết nối ví</div>
                  <div className="text-xs text-blue-600 mt-1">Vui lòng kết nối ví để tương tác với contracts</div>
                </div>
              )}
              {addressesError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm font-medium text-red-800">Lỗi load contract addresses:</div>
                  <div className="text-xs text-red-600 mt-1">{addressesError}</div>
                </div>
              )}
              {artifacts && Object.keys(artifacts).length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-800">ABIs loaded:</div>
                  <div className="text-xs text-green-600 mt-1">
                    {Object.keys(artifacts).length} contracts có ABI
                  </div>
                </div>
              )}
              {contractAddresses && artifacts && (
                (() => {
                  const missingABIs = Object.keys(contractAddresses.contracts).filter(
                    contractName => !artifacts[contractName]?.abi
                  );
                  if (missingABIs.length > 0) {
                    return (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="text-sm font-medium text-yellow-800">Thiếu ABI:</div>
                        <div className="text-xs text-yellow-600 mt-1">
                          {missingABIs.join(', ')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
              <div className="space-y-1">
                {Object.entries(contractGroups).flatMap(([groupName, contracts]) =>
                  contracts.map((contractName) => (
                    <div key={contractName} className="relative group">
                      <Button
                        variant={selectedContractName === contractName ? "default" : "ghost"}
                        size="sm"
                        className={`w-full justify-start text-xs h-7 px-2 pr-8 ${selectedContractName === contractName
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        onClick={() => loadContract(contractName)}
                        disabled={!contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts] || !artifacts[contractName]?.abi || isLoading}
                        title={!contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts]
                          ? `Không tìm thấy địa chỉ contract cho ${contractName}`
                          : !artifacts[contractName]?.abi
                            ? `Không tìm thấy ABI cho ${contractName}`
                            : isLoading
                              ? 'Đang tải...'
                              : `Tải contract ${contractName}`}
                      >
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts] && artifacts[contractName]?.abi
                            ? 'bg-green-500'
                            : contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts] && !artifacts[contractName]?.abi
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                            }`} />
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${groupName === 'Core' ? 'bg-gray-100 dark:bg-gray-800' :
                            groupName === 'Player' ? 'bg-blue-100 dark:bg-blue-900' :
                              groupName === 'Item' ? 'bg-green-100 dark:bg-green-900' :
                                groupName === 'Weather' ? 'bg-yellow-100 dark:bg-yellow-900' :
                                  groupName === 'Plot' ? 'bg-orange-100 dark:bg-orange-900' :
                                    groupName === 'Inventory' ? 'bg-purple-100 dark:bg-purple-900' :
                                      groupName === 'Plant' ? 'bg-pink-100 dark:bg-pink-900' :
                                        groupName === 'Fishing' ? 'bg-cyan-100 dark:bg-cyan-900' :
                                          'bg-indigo-100 dark:bg-indigo-900'
                            }`}>
                            {groupName === 'Core' ? '🌍' :
                              groupName === 'Player' ? '👤' :
                                groupName === 'Item' ? '📦' :
                                  groupName === 'Weather' ? '🌤️' :
                                    groupName === 'Plot' ? '🏡' :
                                      groupName === 'Inventory' ? '🎒' :
                                        groupName === 'Plant' ? '🌱' :
                                          groupName === 'Fishing' ? '🎣' : '🏪'}
                          </div>
                          {contractAddresses?.contracts[contractName as keyof typeof contractAddresses.contracts] && (
                            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                              {contractAddresses.contracts[contractName as keyof typeof contractAddresses.contracts].slice(-5)}
                            </span>
                          )}
                          <span className="truncate text-xs">
                            {isLoading && selectedContractName === contractName ? 'Loading...' : contractName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`ml-auto text-xs h-3 px-1 flex-shrink-0 ${contractName.includes('Component') ? 'border-blue-300 text-blue-700 bg-blue-50' :
                              contractName.includes('Logic') ? 'border-purple-300 text-purple-700 bg-purple-50' :
                                contractName.includes('Proxy') ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                  contractName === 'World' ? 'border-gray-300 text-gray-700 bg-gray-50' :
                                    'border-green-300 text-green-700 bg-green-50'
                              }`}
                          >
                            {contractName.includes('Component') ? 'C' :
                              contractName.includes('Logic') ? 'L' :
                                contractName.includes('Proxy') ? 'P' :
                                  contractName === 'World' ? 'W' : 'F'}
                          </Badge>
                        </div>
                      </Button>

                      {/* Copy ABI Button */}
                      {artifacts[contractName]?.abi && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`absolute right-1 top-0.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${copyingABI === contractName ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          onClick={(e) => copyABI(contractName, e)}
                          title="Copy ABI"
                        >
                          {copyingABI === contractName ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Contract Functions */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8">
          {contract && selectedContractName ? (
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <span className="text-sm">⚡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                      {selectedContractName}
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Tương tác với các function của smart contract
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                    Active
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <ContractFunctions contract={contract} />
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Chọn một contract để bắt đầu
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {!signer ? 'Vui lòng kết nối ví để tải contracts' : 'Chọn một contract từ danh sách bên trái'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Hidden ContractManager for functionality */}
      <div className="hidden">
        <ContractManager
          provider={null}
          signer={signer}
          contractAddresses={contractAddresses}
          onContractLoad={handleContractLoad}
        />
      </div>
    </div>
  )
}