import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { messagesApi, formatDate } from '../types/api';
import { normalizeList } from '../utils/normalize';
import { Mail, MailOpen, Trash2, Send, Search, Archive, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  loan_id: number | null;
  subject: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ recipient_id: 0, subject: '', message: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    loadUnreadCount();
  }, [folder]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await messagesApi.getMessages(folder);
      const msgs = normalizeList<Message>(response);
      setMessages(msgs as Message[]);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await messagesApi.getUnreadCount();
      const data: any = response as any;
      const unread = data?.data?.unread ?? data?.data?.count ?? data?.unread ?? 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleReadMessage = async (msg: Message) => {
    setSelectedMessage(msg);
    if (!msg.is_read && folder === 'inbox') {
      try {
        await messagesApi.markRead(msg.id);
        await loadMessages();
        await loadUnreadCount();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await messagesApi.delete(id);
      setSelectedMessage(null);
      await loadMessages();
      toast({ title: 'Message deleted' });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.recipient_id || !composeData.subject || !composeData.message) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    try {
      await messagesApi.send(composeData);
      setComposeOpen(false);
      setComposeData({ recipient_id: 0, subject: '', message: '' });
      toast({ title: 'Message sent successfully' });
      loadMessages();
    } catch (error) {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Messages</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <Tabs value={folder} onValueChange={(v) => setFolder(v as 'inbox' | 'sent')} className="w-full">
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inbox
            {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground">No messages in inbox</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted ${
                        !msg.is_read ? 'bg-primary/5 font-medium' : ''
                      }`}
                      onClick={() => handleReadMessage(msg)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{msg.sender_name || 'System'}</p>
                          <p className="text-sm">{msg.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!msg.is_read && <Badge>New</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : messages.length === 0 ? (
                <p className="text-muted-foreground">No sent messages</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => handleReadMessage(msg)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">To: {msg.recipient_name || 'Unknown'}</p>
                          <p className="text-sm">{msg.subject}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedMessage.subject}</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedMessage(null)}>×</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                From: {selectedMessage.sender_name || 'System'} • {formatDate(selectedMessage.created_at)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              {selectedMessage.loan_id && (
                <div className="mt-4 pt-4 border-t">
                  <Link to={`/loans/${selectedMessage.loan_id}`}>
                    <Button variant="outline">View Related Loan</Button>
                  </Link>
                </div>
              )}
              <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>New Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient ID</label>
                  <Input
                    type="number"
                    value={composeData.recipient_id}
                    onChange={(e) =>
                      setComposeData({ ...composeData, recipient_id: parseInt(e.target.value) })
                    }
                    placeholder="Enter recipient user ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={composeData.subject}
                    onChange={(e) =>
                      setComposeData({ ...composeData, subject: e.target.value })
                    }
                    placeholder="Message subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    value={composeData.message}
                    onChange={(e) =>
                      setComposeData({ ...composeData, message: e.target.value })
                    }
                    placeholder="Your message"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
