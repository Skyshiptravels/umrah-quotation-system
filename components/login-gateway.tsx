"use client"

import { useState } from "react"
import type { User, UserRole } from "@/app/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plane, Shield, Users, Briefcase, LogIn, Eye, EyeOff } from "lucide-react"

const AUTH_TOKEN_KEY = "authToken"
const AUTH_USER_KEY = "authUser"

/** Simple email format check — avoids rejecting valid addresses like testuser@example.com */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginGatewayProps {
  onLogin: (user: User, token: string) => void
}

interface LoginApiResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
  organization?: {
    id: string
    name: string
  }
  error?: string
}

function mapApiUserToUser(apiUser: LoginApiResponse["user"]): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    ...(apiUser.role === "agent" ? { agentCategory: "category2" as const } : {}),
  }
}

export function LoginGateway({ onLogin }: LoginGatewayProps) {
  const [selectedPortal, setSelectedPortal] = useState<UserRole>("staff")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const clearError = () => {
    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      setError("Email and password are required")
      return
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      let data: LoginApiResponse | null = null
      try {
        data = (await response.json()) as LoginApiResponse
      } catch {
        data = null
      }

      if (!response.ok) {
        setError(data?.error ?? "Invalid email or password")
        return
      }

      if (!data?.token || !data.user) {
        setError("Invalid response from server")
        return
      }

      const user = mapApiUserToUser(data.user)

      if (user.role !== selectedPortal) {
        setError(`This account is registered as ${user.role}, not ${selectedPortal}`)
        return
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
      if (data.organization) {
        localStorage.setItem("authOrganization", JSON.stringify(data.organization))
      }

      onLogin(user, data.token)
    } catch {
      setError("Unable to reach the server. Check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = (role: UserRole) => {
    clearError()
    const quickUsers: Record<UserRole, User> = {
      admin: { id: "admin-1", name: "Admin User", email: "admin@skyship.pk", role: "admin" },
      staff: {
        id: "staff-1",
        name: "Staff Member",
        email: "staff@skyship.pk",
        role: "staff",
        agentCategory: "category1",
      },
      agent: {
        id: "agent-1",
        name: "Freelance Agent",
        email: "agent1@skyship.pk",
        role: "agent",
        agentCategory: "category2",
      },
    }
    onLogin(quickUsers[role], "demo-token")
  }

  const portalConfig = {
    admin: {
      icon: Shield,
      title: "Admin Portal",
      description: "Full system access and configuration",
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    staff: {
      icon: Users,
      title: "Staff Dashboard",
      description: "Create quotations for clients",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    agent: {
      icon: Briefcase,
      title: "Agent Portal",
      description: "Freelance agent quotation builder",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  }

  const currentPortal = portalConfig[selectedPortal]
  const PortalIcon = currentPortal.icon

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Plane className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Skyship Travels</h1>
          <p className="text-muted-foreground mt-2">Umrah Quotation Management System</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-foreground">Gateway Login</CardTitle>
            <CardDescription>Select your portal and sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs
              value={selectedPortal}
              onValueChange={(value) => {
                setSelectedPortal(value as UserRole)
                clearError()
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 bg-secondary">
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-chart-4 data-[state=active]:text-white"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Staff</span>
                </TabsTrigger>
                <TabsTrigger
                  value="agent"
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  <Briefcase className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Agent</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className={`p-4 rounded-lg ${currentPortal.bgColor} flex items-center gap-4`}>
              <div
                className={`w-12 h-12 rounded-full ${currentPortal.bgColor} flex items-center justify-center`}
              >
                <PortalIcon className={`w-6 h-6 ${currentPortal.color}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${currentPortal.color}`}>{currentPortal.title}</h3>
                <p className="text-sm text-muted-foreground">{currentPortal.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError()
                  }}
                  className="bg-input border-border"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearError()
                    }}
                    className="bg-input border-border pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground mb-3">
                Quick Demo Access (Development Only)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickLogin("admin")}
                  className="text-xs border-chart-4/30 text-chart-4 hover:bg-chart-4/10"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickLogin("staff")}
                  className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Staff
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickLogin("agent")}
                  className="text-xs border-accent/30 text-accent hover:bg-accent/10"
                >
                  <Briefcase className="w-3 h-3 mr-1" />
                  Agent
                </Button>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground space-y-1">
              <p>API test account (Admin tab):</p>
              <p>testuser@example.com / TestPassword123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
