"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ethers } from 'ethers'
import {
  GalleryVerticalEnd,
  FileText,
  Building2,
  Users,
  Leaf,
  Package,
  Package2,
  Wallet,
  Server,
  Upload,
  Tractor,
  Map,
  Store
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWallet } from "@/context/WalletContext"

// Navigation data
const navigationData = {
  main: [
    {
      title: "Contract Explorer",
      icon: GalleryVerticalEnd,
      url: "/",
      items: [
        {
          title: "Main Explorer",
          url: "/",
          icon: FileText,
        },
        {
          title: "Deploy Contracts",
          url: "/deploy",
          icon: Upload,
        },
      ],
    },
    {
      title: "Game Management",
      icon: Building2,
      url: "/items",
      items: [
        {
          title: "Item Management",
          url: "/items",
          icon: Package2,
        },
        {
          title: "Player Management",
          url: "/players",
          icon: Users,
        },
        {
          title: "Farmer",
          url: "/plots",
          icon: Tractor,
        },
        {
          title: "NPC Market",
          url: "/npcmarket",
          icon: Store,
        },
        {
          title: "NPC Market Items",
          url: "/npcmarket/items",
          icon: Package,
        },
      ],
    },
  ],
}

// Component để hiển thị địa chỉ ví
function WalletAddress({ signer }: { signer: ethers.Signer }) {
  const [address, setAddress] = React.useState<string>('Đang tải...')
  const [fullAddress, setFullAddress] = React.useState<string>('')

  React.useEffect(() => {
    const getAddress = async () => {
      try {
        const addr = await signer.getAddress()
        setFullAddress(addr)
        setAddress(`${addr.slice(0, 6)}...${addr.slice(-4)}`)
      } catch (error) {
        setAddress('Lỗi')
        setFullAddress('')
      }
    }
    getAddress()
  }, [signer])

  const handleCopy = () => {
    if (fullAddress) {
      navigator.clipboard.writeText(fullAddress)
    }
  }

  return (
    <div className="flex items-center justify-between space-x-1">
      <div className="text-xs text-muted-foreground font-mono">
        {address}
      </div>
      {fullAddress && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-4 w-4 p-0"
        >
          <svg
            className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </Button>
      )}
    </div>
  )
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> { }

export function AppSidebar({ ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { provider, signer, selectedNetwork, setSelectedNetwork, setProvider, setSigner } = useWallet()
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [showNetworkOptions, setShowNetworkOptions] = React.useState(false)

  const connectWallet = async (networkType: 'metamask' | 'hardhat') => {
    try {
      setIsConnecting(true)

      if (networkType === 'metamask') {
        if (typeof window.ethereum === 'undefined') {
          alert('Vui lòng cài đặt MetaMask!')
          return
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const account = accounts[0]

        // Create provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()

        // Get network
        const network = await provider.getNetwork()
        const networkName = network.name === 'unknown' ? `chain-${network.chainId}` : network.name

        setSelectedNetwork(networkName)
        setProvider(provider)
        setSigner(signer)
      } else if (networkType === 'hardhat') {
        // Connect to Hardhat local network
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')

        // Check if Hardhat is running
        try {
          await provider.getNetwork()
        } catch (error) {
          alert('Không thể kết nối đến Hardhat local. Vui lòng chạy "npx hardhat node" trước.')
          return
        }

        // Use the first account from Hardhat
        const accounts = await provider.listAccounts()
        if (accounts.length === 0) {
          alert('Không tìm thấy account nào trong Hardhat local.')
          return
        }

        const signer = provider.getSigner(accounts[0])
        setSelectedNetwork('hardhat')
        setProvider(provider)
        setSigner(signer)
      }

      setShowNetworkOptions(false)
    } catch (error) {
      console.error('Lỗi kết nối ví:', error)
      alert('Lỗi kết nối ví: ' + (error as Error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setSigner(null)
    setSelectedNetwork('hardhat')
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">Sunnyside Acres</span>
                  <span className="text-xs">Contract Explorer</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {navigationData.main.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.url}
                    className="font-medium text-sm"
                  >
                    <item.icon className="size-4 mr-2" />
                    {item.title}
                  </Link>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                        >
                          <Link href={subItem.url} className="text-xs">
                            <subItem.icon className="size-3 mr-2" />
                            {subItem.title}
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Wallet Connect Section - Bottom */}
        <SidebarGroup className="mt-auto">
          <Card className="mx-3 mb-4">
            <CardContent className="p-3">
              {!signer ? (
                <div className="space-y-2">
                  {!showNetworkOptions ? (
                    <Button
                      onClick={() => setShowNetworkOptions(true)}
                      disabled={isConnecting}
                      className="w-full text-xs"
                      size="sm"
                    >
                      <Wallet className="mr-2 h-3 w-3" />
                      Kết nối Ví
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={() => connectWallet('metamask')}
                        disabled={isConnecting}
                        className="w-full text-xs"
                        size="sm"
                      >
                        <Wallet className="mr-2 h-3 w-3" />
                        MetaMask
                      </Button>
                      <Button
                        onClick={() => connectWallet('hardhat')}
                        disabled={isConnecting}
                        variant="outline"
                        className="w-full text-xs"
                        size="sm"
                      >
                        <Server className="mr-2 h-3 w-3" />
                        Hardhat Local
                      </Button>
                      <Button
                        onClick={() => setShowNetworkOptions(false)}
                        variant="ghost"
                        className="w-full text-xs"
                        size="sm"
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Đã kết nối</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectWallet}
                      className="h-6 px-2 text-xs"
                    >
                      Ngắt
                    </Button>
                  </div>
                  <WalletAddress signer={signer} />
                  <div className="text-xs text-muted-foreground">
                    Network: {selectedNetwork}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
