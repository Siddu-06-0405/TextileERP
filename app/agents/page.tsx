"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  User,
  Factory,
  Eye,
  Edit,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import {
  useUserRole,
  hasPermissionToAddAgent,
  hasPermissionToEditAgent,
} from "@/lib/user-role";

// Agent interface based on updated API response
interface Agent {
  _id: string;
  name: string;
  factory: string[];
  createdAt: string;
  updatedAt: string;
  agentId: string;
  __v: number;
}

export default function AgentsPage() {
  const { toast } = useToast();
  const { role, isLoading: roleLoading } = useUserRole();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingAgent, setAddingAgent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    factories: [] as string[],
  });
  const [currentFactory, setCurrentFactory] = useState("");

  // Fetch agents from backend on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setAgentsLoading(true);
        setAgentsError(null);

        const response = await fetch(`${API_BASE_URL}/agent/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agents: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success) {
          setAgents(data.agents || []);
          toast({
            title: "Agents loaded",
            description: `Loaded ${
              data.agents?.length || 0
            } agents successfully`,
            variant: "default",
          });
        } else {
          throw new Error(data.message || "Failed to fetch agents");
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
        setAgentsError(
          err instanceof Error ? err.message : "Failed to fetch agents"
        );
        toast({
          title: "Failed to load agents",
          description:
            err instanceof Error ? err.message : "Failed to fetch agents",
          variant: "destructive",
        });
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgents();
  }, [toast]);

  // Filter agents based on search term
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.factory.some((f) =>
        f.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      agent.agentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addFactory = () => {
    if (
      currentFactory.trim() &&
      !formData.factories.includes(currentFactory.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        factories: [...prev.factories, currentFactory.trim()],
      }));
      setCurrentFactory("");
    }
  };

  const removeFactory = (factoryToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      factories: prev.factories.filter((f) => f !== factoryToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFactory();
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user has permission to add agents
    if (!hasPermissionToAddAgent(role)) {
      toast({
        title: "Access Denied",
        description: "Only Owners can add agents.",
        variant: "destructive",
      });
      return;
    }

    if (formData.factories.length === 0) {
      setAddError("At least one factory is required");
      return;
    }

    setAddingAgent(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/agent/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "owner", // Assuming owner role for demo
        },
        body: JSON.stringify({
          name: formData.name,
          factory: formData.factories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add agent");
      }

      const result = await response.json();

      setAddSuccess(true);
      toast({
        title: "Agent Added Successfully",
        description: `Agent ${formData.name} has been added with ${formData.factories.length} factories`,
        variant: "default",
      });

      // Add the new agent to the list
      setAgents((prev) => [...prev, result.agent]);

      // Reset form
      setFormData({ name: "", factories: [] });
      setCurrentFactory("");

      // Close dialog after a short delay
      setTimeout(() => {
        setIsAddDialogOpen(false);
        setAddSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setAddError(errorMessage);
      toast({
        title: "Failed to add agent",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAddingAgent(false);
    }
  };

  return (
    <TooltipProvider>
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Agents</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="sm:hidden">
            <h1 className="text-lg font-semibold">Agents</h1>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Agents</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={!hasPermissionToAddAgent(role) || roleLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Agent
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                {!hasPermissionToAddAgent(role) && (
                  <TooltipContent>
                    <p>Only Owners can add agents</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <DialogContent className="max-w-[95vw] sm:max-w-lg mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Agent</DialogTitle>
                  <DialogDescription>
                    Create an agent record with multiple factories
                  </DialogDescription>
                </DialogHeader>

                {!hasPermissionToAddAgent(role) && (
                  <div className="bg-red-50 p-3 rounded text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Only Owners can add
                    agents
                  </div>
                )}

                {addSuccess && (
                  <div className="bg-green-50 p-3 rounded text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Agent added successfully
                  </div>
                )}
                {addError && (
                  <div className="bg-red-50 p-3 rounded text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {addError}
                  </div>
                )}

                <form onSubmit={handleAddAgent} className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                      disabled={!hasPermissionToAddAgent(role)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Factories *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentFactory}
                        onChange={(e) => setCurrentFactory(e.target.value)}
                        placeholder="Enter factory name..."
                        onKeyPress={handleKeyPress}
                        disabled={!hasPermissionToAddAgent(role)}
                      />
                      <Button
                        type="button"
                        onClick={addFactory}
                        disabled={!currentFactory.trim()}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Display added factories as badges */}
                    {formData.factories.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                        {formData.factories.map((factory, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1"
                          >
                            <Factory className="h-3 w-3" />
                            {factory}
                            <button
                              type="button"
                              onClick={() => removeFactory(factory)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {formData.factories.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Add at least one factory to continue
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      addingAgent ||
                      !formData.name ||
                      formData.factories.length === 0
                    }
                    className="w-full"
                  >
                    {addingAgent ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      `Add Agent with ${formData.factories.length} ${
                        formData.factories.length === 1
                          ? "Factory"
                          : "Factories"
                      }`
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, factory, or ID..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Agents Display */}
          {agentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading agents...</span>
              </div>
            </div>
          ) : agentsError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Error loading agents
                </h3>
                <p className="text-muted-foreground mb-4">{agentsError}</p>
                <Button onClick={() => window.location.reload()}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredAgents.map((agent) => (
                <Card
                  key={agent._id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        {agent.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {agent.agentId}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Factories ({agent.factory.length})
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {agent.factory.map((factory, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            <Factory className="h-3 w-3" />
                            {factory}
                          </Badge>
                        ))}
                      </div>
                      {agent.factory.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No factories assigned
                        </p>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex gap-2 pt-2">
                          <Link
                            href={
                              hasPermissionToEditAgent(role)
                                ? `/agents/${agent._id}/edit`
                                : "#"
                            }
                          >
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={!hasPermissionToEditAgent(role)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </TooltipTrigger>
                      {!hasPermissionToEditAgent(role) && (
                        <TooltipContent>
                          <p>Only Owners can edit agents</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredAgents.length === 0 && !agentsLoading && !agentsError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No agents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "No agents match your search criteria"
                    : "Get started by adding your first agent"}
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Agent
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </TooltipProvider>
  );
}
