import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, Package, TrendingUp, Lock, Plus,
  Trash2, DollarSign, Edit2, Check, X as CloseIcon,
  Loader2, RefreshCw, FileText
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { APP_CONFIG, COUNTRY_CODES, CATEGORIES_RUS } from '@/lib/constants';
import type { User, TelegramAccount, Transaction } from '@shared/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const getFlagEmoji = (countryCode?: string) => {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'RU': '🇷🇺', 'NL': '🇳🇱',
    'KZ': '🇰🇿', 'UA': '🇺🇦', 'BY': '🇧🇾', 'ID': '🇮🇩', 'FR': '🇫🇷',
    'PL': '🇵🇱', 'CA': '🇨🇦'
  };
  return flags[countryCode || ''] || '🏳️';
};
export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bulkAccountsText, setBulkAccountsText] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState<string>('');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<TelegramAccount>>({
    category: 'New',
    country: 'Россия',
    price: 2,
    age: '1 месяц',
    description: '',
    details: '',
    phoneNumber: '',
    lastCode: ''
  });
  const fetchAdminData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [uRes, aRes, tRes] = await Promise.all([
        api<{ items: User[] }>('/api/admin/users'),
        api<{ items: TelegramAccount[] }>('/api/admin/accounts'),
        api<{ items: Transaction[] }>('/api/admin/transactions')
      ]);
      setUsers(uRes.items || []);
      setAccounts(aRes.items || []);
      setTransactions(tRes.items || []);
    } catch (err: any) {
      toast.error('Ошибка загрузки данных', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  useEffect(() => {
    const saved = localStorage.getItem('milfa_admin_auth');
    if (saved === 'true') setIsAuthenticated(true);
  }, []);
  useEffect(() => {
    if (isAuthenticated) fetchAdminData();
  }, [isAuthenticated, fetchAdminData]);
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_CONFIG.adminPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('milfa_admin_auth', 'true');
      toast.success('Доступ предоставлен');
    } else {
      toast.error('Неверный пароль');
    }
  };
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('milfa_admin_auth');
  };
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.price || !newAccount.details?.trim()) {
      toast.error('Заполните цену и данные сессии');
      return;
    }
    try {
      const countryCode = (COUNTRY_CODES as Record<string, string>)[newAccount.country || 'Россия'] || 'RU';
      await api('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({ ...newAccount, price: Number(newAccount.price), countryCode })
      });
      toast.success('Аккаунт добавлен');
      setNewAccount({
        category: 'New',
        country: 'Россия',
        price: 2,
        age: '1 месяц',
        description: '',
        details: '',
        phoneNumber: '',
        lastCode: ''
      });
      fetchAdminData();
    } catch (err: any) {
      toast.error('Ошибка создания: ' + err.message);
    }
  };
  const bulkCategoryNormalize = (val: string): TelegramAccount['category'] => {
    const norm = val.trim().toLowerCase();
    if (norm.includes('нов') || norm.includes('new')) return 'New';
    if (norm.includes('отраб') || norm.includes('aged')) return 'Aged';
    if (norm.includes('дв') || norm.includes('premium')) return 'Premium';
    if (norm.includes('другие') || norm.includes('verif') || norm.includes('подтв')) return 'Verified';
    return 'New';
  };
  const parseBulkAccounts = () => {
    return bulkAccountsText
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(part => part.trim());
        const [phoneNumber, price, country = 'Россия', age = '1 месяц', categoryRaw = 'New', description = '', codeOrSession = '', ...detailsParts] = parts;
        const details = detailsParts.length > 0 ? detailsParts.join('|').trim() : codeOrSession;
        const codeMatch = codeOrSession.match(/(?<!\d)\d{5,6}(?!\d)/);
        return {
          phoneNumber,
          price: Number(price || newAccount.price || 2),
          country,
          age,
          category: bulkCategoryNormalize(categoryRaw),
          description,
          details: details || line,
          lastCode: codeMatch?.[0] || undefined,
        };
      });
  };
  const handleBulkCreateAccounts = async () => {
    const accountsToCreate = parseBulkAccounts();
    if (accountsToCreate.length === 0) {
      toast.error('Добавьте строки для импорта');
      return;
    }
    try {
      const res = await api<{ count: number }>('/api/admin/accounts/bulk', {
        method: 'POST',
        body: JSON.stringify({ accounts: accountsToCreate })
      });
      toast.success(`Импортировано аккаунтов: ${res.count}`);
      setBulkAccountsText('');
      fetchAdminData();
    } catch (err: any) {
      toast.error('Ошибка bulk import: ' + err.message);
    }
  };
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Удалить этот аккаунт?')) return;
    try {
      await api(`/api/admin/accounts/${id}`, { method: 'DELETE' });
      toast.success('Аккаунт удален');
      fetchAdminData();
    } catch (err: any) {
      toast.error('Ошибка удаления: ' + err.message);
    }
  };
  const handleUpdateBalance = async (email: string) => {
    const amount = parseFloat(newBalanceValue);
    if (isNaN(amount)) {
      toast.error('Введите число');
      return;
    }
    setIsUpdatingBalance(true);
    try {
      await api('/api/admin/users/update-balance', {
        method: 'POST',
        body: JSON.stringify({ email, amount })
      });
      toast.success('Баланс обновлен');
      setEditingUserId(null);
      fetchAdminData();
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setIsUpdatingBalance(false);
    }
  };
  const stats = useMemo(() => {
    const totalBalance = users.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);
    const activeInventory = accounts.filter(a => a.status === 'available').length;
    return { users: users.length, balance: totalBalance, inventory: activeInventory };
  }, [users, accounts]);
  if (!isAuthenticated) {
    return (
      <AppLayout container={false}>
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-white/5 bg-white/[0.01] glass-effect rounded-[3rem] p-10 zen-shadow">
            <div className="text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-telegram flex items-center justify-center shadow-2xl">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-black">Milfa Admin</h1>
              <form onSubmit={handleLogin} className="space-y-6">
                <Input
                  type="password"
                  placeholder="Пароль"
                  className="h-16 rounded-2xl bg-white/[0.03] border-white/5 text-center text-xl font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black bg-telegram shadow-lg">Войти</Button>
              </form>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-10 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-display font-black tracking-tight">Console</h1>
            <p className="text-muted-foreground text-sm opacity-60">System status: active</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchAdminData} className="rounded-xl h-12 w-12" disabled={loading}>
              <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" onClick={handleLogout} className="rounded-xl h-12 font-bold px-6">Выйти</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="glass-effect rounded-[2.5rem] p-8 border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400"><Users className="h-6 w-6" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Users</span>
            </div>
            <p className="text-4xl font-display font-black">{stats.users}</p>
          </Card>
          <Card className="glass-effect rounded-[2.5rem] p-8 border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-green-500/10 text-green-400"><DollarSign className="h-6 w-6" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Capital</span>
            </div>
            <p className="text-4xl font-display font-black text-primary">${stats.balance.toFixed(2)}</p>
          </Card>
          <Card className="glass-effect rounded-[2.5rem] p-8 border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400"><Package className="h-6 w-6" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Stock</span>
            </div>
            <p className="text-4xl font-display font-black">{stats.inventory}</p>
          </Card>
        </div>
        <Tabs defaultValue="inventory" className="space-y-8">
          <TabsList className="bg-white/[0.02] border-white/5 rounded-2xl h-14 p-1">
            <TabsTrigger value="inventory" className="rounded-xl px-8 font-black uppercase text-xs tracking-widest">Stock</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-8 font-black uppercase text-xs tracking-widest">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-xl px-8 font-black uppercase text-xs tracking-widest">Log</TabsTrigger>
          </TabsList>
          <TabsContent value="inventory" className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <Card className="glass-effect rounded-[2rem] p-8 border-white/5 sticky top-24">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                    <Plus className="h-6 w-6 text-primary" /> New Item
                  </h3>
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="h-12 rounded-xl bg-white/[0.03] border-white/5 px-4 text-sm font-bold text-foreground outline-none"
                        value={newAccount.country}
                        onChange={(e) => setNewAccount({...newAccount, country: e.target.value})}
                      >
                        {Object.keys(COUNTRY_CODES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select
                        className="h-12 rounded-xl bg-white/[0.03] border-white/5 px-4 text-sm font-bold text-foreground outline-none"
                        value={newAccount.category}
                        onChange={(e) => setNewAccount({...newAccount, category: e.target.value as any})}
                      >
                        {['New', 'Aged', 'Premium', 'Verified'].map(cat => <option key={cat} value={cat}>{CATEGORIES_RUS[cat as keyof typeof CATEGORIES_RUS]}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" step="0.01" className="h-12" placeholder="Price $" value={newAccount.price || ''} onChange={(e) => setNewAccount({...newAccount, price: Number(e.target.value)})} />
                      <Input className="h-12" placeholder="Age" value={newAccount.age || ''} onChange={(e) => setNewAccount({...newAccount, age: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input className="h-12" placeholder="Телефон" value={newAccount.phoneNumber || ''} onChange={(e) => setNewAccount({...newAccount, phoneNumber: e.target.value})} />
                      <Input className="h-12" placeholder="Last code" value={newAccount.lastCode || ''} onChange={(e) => setNewAccount({...newAccount, lastCode: e.target.value})} />
                    </div>
                    <textarea
                      className="w-full h-24 rounded-xl bg-white/[0.03] border-white/5 p-4 text-xs outline-none resize-none text-foreground"
                      placeholder="Описание продукта"
                      value={newAccount.description || ''}
                      onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                    />
                    <textarea
                      className="w-full h-32 rounded-xl bg-white/[0.03] border-white/5 p-4 text-xs font-mono outline-none text-foreground"
                      placeholder="Session details..."
                      required
                      value={newAccount.details || ''}
                      onChange={(e) => setNewAccount({...newAccount, details: e.target.value})}
                    />
                    <Button type="submit" className="w-full h-14 rounded-xl bg-telegram font-black text-white">Create Account</Button>
                  </form>
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <textarea
                      className="w-full h-28 rounded-xl bg-white/[0.03] border-white/5 p-4 text-xs font-mono outline-none text-foreground"
                      placeholder="Bulk import: phone | price | country | age | category | description | code/session"
                      value={bulkAccountsText}
                      onChange={(e) => setBulkAccountsText(e.target.value)}
                    />
                    <Button type="button" onClick={handleBulkCreateAccounts} className="w-full h-12 rounded-xl bg-primary/90 font-black text-white">Bulk import</Button>
                  </div>
                </Card>
              </div>
              <div className="lg:col-span-7 space-y-4">
                {accounts.map(acc => (
                  <Card key={acc.id} className="p-6 border-white/5 bg-white/[0.01] glass-effect rounded-3xl flex justify-between items-center group">
                    <div className="flex items-center gap-6">
                      <span className="text-3xl">{getFlagEmoji(acc.countryCode)}</span>
                      <div>
                        <p className="font-bold">{acc.country}</p>
                        {acc.phoneNumber && <p className="text-xs text-muted-foreground font-mono">{acc.phoneNumber}</p>}
                        {acc.description && <p className="text-[10px] text-muted-foreground/70 max-w-[280px] truncate">{acc.description}</p>}
                        <Badge variant="outline" className={cn("text-[8px] uppercase font-black", acc.status === 'available' ? "text-green-400 border-green-400/20" : "text-red-400 border-red-400/20")}>
                          {acc.status === 'available' ? 'Available' : 'Sold'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-display font-black text-primary">${Number(acc.price).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(acc.id)} className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            {users.map(u => (
              <Card key={u.id} className="p-6 border-white/5 bg-white/[0.01] glass-effect rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Users className="h-6 w-6" /></div>
                  <div>
                    <p className="font-black">{u.email}</p>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{u.id?.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {editingUserId === u.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-10 w-32 rounded-xl text-center font-bold"
                        value={newBalanceValue}
                        onChange={(e) => setNewBalanceValue(e.target.value)}
                        autoFocus
                      />
                      <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-xl" onClick={() => handleUpdateBalance(u.email)} disabled={isUpdatingBalance}>
                        {isUpdatingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => setEditingUserId(null)}><CloseIcon className="h-5 w-5" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-display font-black text-primary">${(Number(u.balance) || 0).toFixed(2)}</p>
                        <p className="text-[9px] opacity-40 font-black">{(u.purchasedAccountIds || []).length} items</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:text-primary" onClick={() => { setEditingUserId(u.id); setNewBalanceValue(String(u.balance || 0)); }}>
                        <Edit2 className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="transactions" className="space-y-4">
            {transactions.map(t => (
              <Card key={t.id} className="p-6 border-white/5 bg-white/[0.01] glass-effect rounded-3xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", t.type === 'deposit' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                    {t.type === 'deposit' ? <TrendingUp className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-black capitalize">{t.type}</p>
                    <p className="text-[10px] opacity-40 uppercase">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-2xl font-display font-black", t.type === 'deposit' ? "text-green-400" : "text-red-400")}>
                    {t.type === 'deposit' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                  </p>
                  <p className="text-[9px] opacity-30 truncate max-w-[120px]">{t.userId}</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}