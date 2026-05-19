import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTitle } from '@/components/PageTitle';
import { messagesApi, formatDate, adminApi, authApi } from '../types/api';
import { secureStorage } from '@/utils/secureStorage';
import { normalizeList } from '../utils/normalize';
import { Mail, MailOpen, Trash2, Send, Search, Archive, Star } from 'lucide-react';
import { toast } from 'sonner';

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

interface BorrowerOption {
  user_id: number;
  name: string;
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ recipient_id: 0, subject: '', message: '' });
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [borrowersLoading, setBorrowersLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminUserId, setAdminUserId] = useState<number | null>(null);

  useEffect(() => {
    loadMessages();
    loadUnreadCount();
    loadUserAndBorrowers();
  }, [folder]);

  const loadUserAndBorrowers = async () => {
    try {
      // Get current user from secureStorage
      const user = await secureStorage.getUser();
      if (user) {
        setCurrentUser(user);

        // If admin, load borrowers list
        if (user.role === 'admin') {
          setBorrowersLoading(true);
          try {
            const response = await adminApi.getBorrowers();
            const data = response as any;
            const borrowersData = data?.data?.borrowers || [];

            // Transform borrowers to include user_id and name from user data
            const borrowerOptions = borrowersData
              .filter((b: any) => b.user && b.user.name)
              .map((b: any) => ({
                user_id: b.user_id,
                name: b.user.name,
              }))
              .sort((a, b) => a.name.localeCompare(b.name));

            setBorrowers(borrowerOptions);
          } catch (error) {
            console.error('Failed to load borrowers:', error);
            toast.error('Failed to load borrowers list');
          } finally {
            setBorrowersLoading(false);
          }
        } else {
          // For borrowers, default to admin user ID 1
          // The admin_id can be configured in backend if needed
          setAdminUserId(1);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await Promise.race([
        messagesApi.getMessages(folder),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      const msgs = normalizeList<Message>(response);
      setMessages(msgs as Message[]);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
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
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    let recipientId = composeData.recipient_id;

    // For borrowers, use the admin user ID as recipient
    if (currentUser?.role !== 'admin' && adminUserId) {
      recipientId = adminUserId;
    }

    if (!recipientId || !composeData.subject || !composeData.message) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await messagesApi.send({
        recipient_id: recipientId,
        subject: composeData.subject,
        message: composeData.message,
      });
      setComposeOpen(false);
      setComposeData({ recipient_id: 0, subject: '', message: '' });
      toast.success('Message sent successfully');
      await loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6 gap-2 min-w-0">
        <PageTitle title="Messages" />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-auto">{unreadCount} unread</Badge>
        )}
        <Button onClick={() => setComposeOpen(true)} className="ml-auto">
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
                <Button variant="ghost" onClick={() => setSelectedMessage(null)} aria-label="Close message">×</Button>
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
                  aria-label="Delete message"
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
                {currentUser?.role === 'admin' ? (
                  // Admin: Show borrower dropdown
                  <div>
                    <label className="text-sm font-medium">Select Borrower</label>
                    <Select
                      value={composeData.recipient_id.toString()}
                      onValueChange={(value) =>
                        setComposeData({ ...composeData, recipient_id: parseInt(value) })
                      }
                      disabled={borrowersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a borrower" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowers.map((borrower) => (
                          <SelectItem key={borrower.user_id} value={borrower.user_id.toString()}>
                            {borrower.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // Borrower: Show read-only Admin field
                  <div>
                    <label className="text-sm font-medium">Recipient</label>
                    <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                      Admin
                    </div>
                  </div>
                )}
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
