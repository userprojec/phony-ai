import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bot, Plus, Search, Edit, Trash2, Play, Pause, MoreHorizontal } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { VoiceAgentsS622Aa9440Row } from '@/types/database';

interface VoiceAgent extends VoiceAgentsS622Aa9440Row {
  id: number;
  name: string;
  description: string | null;
  voice_type: string | null;
  voice_accent: string | null;
  language: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const languageLabels: Record<string, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
};

const voiceTypeLabels: Record<string, string> = {
  male: 'Male',
  female: 'Female',
};

export default function VoiceAgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<VoiceAgent | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/voice-agents');
      const result = await response.json();
      
      if (result.success) {
        setAgents(result.data?.list || []);
      } else {
        toast.error(result.error || 'Failed to load voice agents');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleToggleActive = async (agent: VoiceAgent) => {
    try {
      setTogglingId(agent.id);
      const newStatus = !agent.is_active;
      
      const response = await apiFetch(`/api/voice-agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAgents(prev => 
          prev.map(a => a.id === agent.id ? { ...a, is_active: newStatus } : a)
        );
        toast.success(`Voice agent ${newStatus ? 'activated' : 'deactivated'}`);
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;
    
    try {
      const response = await apiFetch(`/api/voice-agents/${agentToDelete.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAgents(prev => prev.filter(a => a.id !== agentToDelete.id));
        toast.success('Voice agent deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete voice agent');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Voice Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI voice agents for automated phone outreach
          </p>
        </div>
        <Button 
          onClick={() => navigate('/voice-agents/new')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bot className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {searchQuery ? 'No agents found' : 'No voice agents yet'}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'Create your first voice agent to start automating phone outreach'
                }
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-6 gap-2"
                  onClick={() => navigate('/voice-agents/new')}
                >
                  <Plus className="h-4 w-4" />
                  Create Agent
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead>Voice</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            agent.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            <Bot className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            {agent.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                                {agent.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent.voice_type && (
                            <Badge variant="secondary" className="rounded-[4px]">
                              {voiceTypeLabels[agent.voice_type] || agent.voice_type}
                            </Badge>
                          )}
                          {agent.voice_accent && (
                            <span className="text-xs text-muted-foreground">
                              {agent.voice_accent}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-[4px]">
                          {languageLabels[agent.language || 'en'] || agent.language || 'English'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={agent.is_active ?? false}
                            onCheckedChange={() => handleToggleActive(agent)}
                            disabled={togglingId === agent.id}
                          />
                          <span className={cn(
                            "text-xs font-medium",
                            agent.is_active ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(agent.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/voice-agents/${agent.id}`)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleActive(agent)}
                              className="gap-2"
                            >
                              {agent.is_active ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setAgentToDelete(agent);
                                setDeleteDialogOpen(true);
                              }}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{agentToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAgentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
