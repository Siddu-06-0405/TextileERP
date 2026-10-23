"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft, Save, X, Loader2, AlertTriangle, CheckCircle, Trash, Plus } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"
import { useUserRole, hasPermissionToEditAgent } from "@/lib/user-role"
import { useToast } from "@/hooks/use-toast"

export default function AgentEditPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { role, isLoading: roleLoading } = useUserRole()
  const agentIdParam = params.id as string

  const [agent, setAgent] = useState({
    agentId: "",
    name: "",
    factory: [""]
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string | string[]) => {
    setAgent((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFactoryChange = (index: number, value: string) => {
    setAgent((prev) => ({
      ...prev,
      factory: prev.factory.map((f, i) => i === index ? value : f)
    }))
  }

  const addFactory = () => {
    setAgent((prev) => ({
      ...prev,
      factory: [...prev.factory, ""]
    }))
  }

  const removeFactory = (index: number) => {
    if (agent.factory.length > 1) {
      setAgent((prev) => ({
        ...prev,
        factory: prev.factory.filter((_, i) => i !== index)
      }))
    }
  }

  // Fetch agent by ID
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE_URL}/agent/${agentIdParam}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch agent: ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        if (!data.success || !data.agent) {
          throw new Error(data.message || 'Agent not found')
        }
        
        setAgent({
          agentId: data.agent.agentId || "",
          name: data.agent.name || "",
          factory: Array.isArray(data.agent.factory) ? data.agent.factory : (data.agent.factory ? [data.agent.factory] : [""])
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent'
        setError(errorMessage)
        toast({
          title: "Error Loading Agent",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    if (agentIdParam) fetchAgent()
  }, [agentIdParam, toast])

  const handleSave = async () => {
    // Check if user has permission to edit agents
    if (!hasPermissionToEditAgent(role)) {
      toast({
        title: "Access Denied",
        description: "Only Owners can edit agents.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true)
      setError(null)

      const nonEmptyFactories = agent.factory.filter(f => f.trim())
      
      if (!agent.name || nonEmptyFactories.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please provide agent name and at least one factory",
          variant: "destructive",
        })
        return;
      }

      // Prepare payload - send factory as array
      const payload = {
        name: agent.name.trim(),
        factory: nonEmptyFactories
      }

      const res = await fetch(`${API_BASE_URL}/agent/${agentIdParam}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role || ""
        },
        body: JSON.stringify(payload),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to update agent')
      }

      if (!responseData.success) {
        throw new Error(responseData.message || 'Update failed')
      }

      // Show success toast
      toast({
        title: "Agent Updated",
        description: "Agent updated successfully",
        variant: "default",
      })

      // Redirect after short delay
      setTimeout(() => {
        router.push('/agents')
      }, 1200)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent'
      setError(errorMessage)
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    // Check if user has permission to edit agents
    if (!hasPermissionToEditAgent(role)) {
      toast({
        title: "Access Denied",
        description: "Only Owners can delete agents.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      return
    }

    try {
      setDeleting(true)
      setError(null)
      
      const res = await fetch(`${API_BASE_URL}/agent/${agentIdParam}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': role || ""
        }
      })

      const responseData = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to delete agent')
      }

      // Show success toast
      toast({
        title: "Agent Deleted",
        description: "Agent deleted successfully",
        variant: "default",
      })

      // Redirect to agents list
      router.push('/agents')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent'
      setError(errorMessage)
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="sm:hidden">
            <h1 className="text-lg font-semibold">Edit Agent</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading agent...
        </div>
      </SidebarInset>
    )
  }

  if (error && !agent.name) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="sm:hidden">
            <h1 className="text-lg font-semibold">Edit Agent</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" onClick={() => location.reload()}>Retry</Button>
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="sm:hidden">
          <h1 className="text-lg font-semibold">Edit Agent</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/agents`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Edit Agent</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Update agent details</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleting || !hasPermissionToEditAgent(role) || roleLoading} 
              className="w-full sm:w-auto"
              title={!hasPermissionToEditAgent(role) ? "Only Owners can delete agents" : ""}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" /> Delete
                </>
              )}
            </Button>
            <Link href={`/agents`} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasPermissionToEditAgent(role) || roleLoading} 
              className="w-full sm:w-auto"
              title={!hasPermissionToEditAgent(role) ? "Only Owners can edit agents" : ""}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {!hasPermissionToEditAgent(role) && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Only Owners can edit agents
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Information</CardTitle>
            <CardDescription>Basic details about the agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              {/* Read-only, autogen from backend */}
              <Input
                id="agentId"
                value={agent.agentId}
                readOnly
                className="opacity-70"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={agent.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter agent name"
                disabled={!hasPermissionToEditAgent(role)}
              />
            </div>
            <div className="space-y-2">
              <Label>Factory Names</Label>
              <div className="space-y-2">
                {agent.factory.map((factory, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={factory}
                      onChange={(e) => handleFactoryChange(index, e.target.value)}
                      placeholder="Enter factory name"
                      disabled={!hasPermissionToEditAgent(role)}
                    />
                    {agent.factory.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeFactory(index)}
                        disabled={!hasPermissionToEditAgent(role)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFactory}
                  disabled={!hasPermissionToEditAgent(role)}
                  className="w-fit"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Factory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}