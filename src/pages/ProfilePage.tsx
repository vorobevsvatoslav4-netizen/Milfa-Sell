import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as UICardDescription } from '@/components/ui/card';
import {
  Wallet, Eye, EyeOff,
  RefreshCcw, Copy, Loader2, Lock,
  DollarSign, ExternalLink, Key, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from '@/lib/api-client';
import type { User, TelegramAccount, CreateInvoiceResponse, GetCodeResponse } from '@shared/types';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';
import { APP_CONFIG, CATEGORIES_RUS } from '@/lib/constants';
const INVOICE_STORE_KEY = 'latest_milfa_invoice';
const normalizeInvoiceId = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text && text !== 'undefined' && text !== 'null' ? text : null;
};
const getFlagEmoji = (countryCode?: string) => {
  const codes: Record<string, string> = { 'US': '🇺🇸', 'GB': '🇬🇧', 'RU': '🇷🇺', 'NL': '🇳🇱', 'KZ': '🇰🇿' };
  return codes[countryCode || ''] || '🏳️';
};
export function ProfilePage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<TelegramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("1");
  const [retrievingCodeId, setRetrievingCodeId] = useState<string | null>(null);
  const [retrievedCodes, setRetrievedCodes] = useState<Record<string, GetCodeResponse>>({});
  const userEmail = useUserStore((state) => state.user?.email);
  const userBalance = useUserStore((state) => state.user?.balance ?? 0);
  const setUser = useUserStore((state) => state.setUser);
  const fetchData = useCallback(async () => {
    if (!userEmail) return;
    try {
      const u = await api<User>(`/profile/${encodeURIComponent(userEmail)}`);
      setUser(u);
      const p = await api<TelegramAccount[]>(`/profile/${encodeURIComponent(userEmail)}/purchases`);
      setPurchases(p || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userEmail, setUser]);
  useEffect(() => {
    if (!userEmail) { navigate('/auth'); return; }
    fetchData();
  }, [userEmail, navigate, fetchData]);
  const handleDepositInitiate = async () => {
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum < APP_CONFIG.minDeposit) {
      toast.error(`Минимум: ${APP_CONFIG.minDeposit}`);
      return;
    }
    setDepositing(true);
    try {
      const res = await api<CreateInvoiceResponse>('/payments/create-invoice', {
        method: 'POST',
        body: JSON.stringify({ amount: amountNum, email: userEmail })
      });
      const invoiceId = normalizeInvoiceId(res.invoiceId ?? res.invoice_id);
      const payUrl = res.payUrl || res.pay_url || res.miniAppInvoiceUrl || res.webAppInvoiceUrl || res.mini_app_invoice_url || res.web_app_invoice_url;
      if (!invoiceId || !payUrl) throw new Error('Payment gateway did not return invoice details');
      localStorage.setItem(INVOICE_STORE_KEY, invoiceId);
      setShowTopUpDialog(false);
      window.open(payUrl, '_blank');
      toast.success("Счет создан");
    } catch (err) {
      toast.error('Ошибка создания счета');
    } finally {
      setDepositing(false);
    }
  };
  const handleVerifyPayment = async () => {
    if (!userEmail) return;
    setVerifying(true);
    try {
      const invId = normalizeInvoiceId(localStorage.getItem(INVOICE_STORE_KEY));
      const res = await api<any>(invId ? `/payments/verify/${encodeURIComponent(invId)}` : `/payments/verify-latest?email=${encodeURIComponent(userEmail)}`);
      if (res.status === 'paid') {
        toast.success(`Пополнено на $${res.amount}`);
        localStorage.removeItem(INVOICE_STORE_KEY);
        fetchData();
      } else {
        toast.info('Оплата не найдена или в ожидании');
      }
    } catch (err) {
      toast.error('Ошибка проверки');
    } finally {
      setVerifying(false);
    }
  };
  const handleGetCode = async (accountId: string) => {
    if (retrievingCodeId) return;
    setRetrievingCodeId(accountId);
    try {
      const res = await api<GetCodeResponse>(`/accounts/get-code/${accountId}?email=${encodeURIComponent(userEmail || '')}`);
      setRetrievedCodes(prev => ({ ...prev, [accountId]: res }));
      toast.success(res.status === 'ready' ? "Код получен" : "Запрос отправлен");
    } catch (err) {
      toast.error("Ошибка получения кода");
    } finally {
      setRetrievingCodeId(null);
    }
  };
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin opacity-20" /></div>;
  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] bg-card/50 glass-effect border-white/5 overflow-hidden zen-shadow">
            <CardHeader className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-telegram flex items-center justify-center shadow-2xl mb-4"><Wallet className="h-8 w-8 text-white" /></div>
              <CardTitle className="text-4xl font-display font-black tracking-tighter">${Number(userBalance).toFixed(2)}</CardTitle>
              <UICardDescription className="text-[10px] font-mono opacity-40 mt-3 truncate px-4">{userEmail}</UICardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-10 space-y-3">
              <Button className="w-full rounded-2xl h-14 text-lg font-black bg-telegram shadow-xl" onClick={() => setShowTopUpDialog(true)}>Пополнить</Button>
              <Button variant="outline" className="w-full rounded-2xl h-12 border-primary/20 text-primary font-bold" onClick={handleVerifyPayment} disabled={verifying}>
                {verifying ? <Loader2 className="animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />} Проверить оплату
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-2xl font-display font-black px-2">Инвентарь</h2>
          {purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map((item) => {
                const retrieved = retrievedCodes[item.id];
                const isRevealed = revealedIds.has(item.id);
                return (
                  <Card key={item.id} className="border-white/5 bg-card/50 glass-effect rounded-[2rem] overflow-hidden zen-shadow p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{getFlagEmoji(item.countryCode)}</span>
                        <div>
                          <h4 className="text-lg font-black uppercase">{item.country} SESSION</h4>
                          <Badge className="bg-primary/10 text-primary uppercase text-[8px] tracking-widest">{CATEGORIES_RUS[item.category as keyof typeof CATEGORIES_RUS] || item.category}</Badge>
                          {item.phoneNumber && (
                            <p className="mt-2 inline-flex rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 font-mono text-xs font-bold text-foreground">
                              {item.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      {retrieved && retrieved.status === 'ready' ? (
                        <div className="p-6 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-between">
                          <p className="text-5xl font-display font-black text-primary tracking-widest">{retrieved.code}</p>
                          <Button className="rounded-xl h-12 w-12 bg-telegram" onClick={() => { navigator.clipboard.writeText(retrieved.code); toast.success('Код скопирован'); }} size="icon"><Copy className="h-5 w-5" /></Button>
                        </div>
                      ) : (
                        <Button className="w-full h-14 rounded-2xl font-black bg-telegram shadow-lg gap-2" onClick={() => handleGetCode(item.id)} disabled={!!retrievingCodeId}>
                          {retrievingCodeId === item.id ? <Loader2 className="animate-spin" /> : <><Key className="h-4 w-4" /> ПОЛУЧИТЬ КОД</>}
                        </Button>
                      )}
                    </div>
                    <div className="w-full md:w-[240px] bg-black/10 rounded-2xl p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase opacity-40">Payload</label>
                        <button onClick={() => { const next = new Set(revealedIds); if(next.has(item.id)) next.delete(item.id); else next.add(item.id); setRevealedIds(next); }} className="text-primary">
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className={cn("text-[8px] font-mono break-all max-h-[80px] overflow-auto", !isRevealed && "blur-xl opacity-10")}>
                        {item.details || "Нет данных"}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center rounded-[2.5rem] border-2 border-dashed border-white/5 bg-card/50">
              <Sparkles className="h-12 w-12 text-primary/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium mb-6">Инвентарь пуст.</p>
              <Link to="/store"><Button className="rounded-full px-10 h-14 font-black bg-telegram shadow-2xl">В МАГАЗИН</Button></Link>
            </div>
          )}
        </div>
      </div>
      <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
        <DialogContent className="rounded-[2.5rem] border-white/5 bg-card/95 p-8 zen-shadow sm:max-w-[400px]">
          <DialogHeader className="mb-6 text-center">
            <DialogTitle className="text-2xl font-black">Crypto Pay</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground mt-2">
              Введите сумму в долларах США. Оплата через официальный @CryptoBot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mb-8">
             <div className="relative">
                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} min={APP_CONFIG.minDeposit} className="h-16 pl-14 rounded-xl bg-black/10 text-2xl font-black text-center" />
             </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setShowTopUpDialog(false)} className="rounded-xl h-12 font-bold">Отмена</Button>
            <Button onClick={handleDepositInitiate} className="rounded-xl h-12 flex-1 font-black bg-telegram shadow-lg" disabled={depositing}>
                {depositing ? <Loader2 className="animate-spin" /> : <>Оплатить <ExternalLink className="ml-2 h-4 w-4" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
export function AuthPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.length < 3) { toast.error("Минимум 3 символа"); return; }
    setLoading(true);
    try {
      const user = await api<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email: identifier }) });
      setUser(user);
      toast.success('Вход выполнен');
      navigate('/profile');
    } catch (err: any) {
      toast.error('Ошибка входа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppLayout container={false}>
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-white/5 bg-card/30 glass-effect rounded-[2.5rem] overflow-hidden zen-shadow p-6">
          <div className="text-center space-y-6 pt-8 pb-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-telegram shadow-2xl"><Lock className="h-8 w-8 text-white" /></div>
            <CardTitle className="text-3xl font-black">Milfa Sell</CardTitle>
          </div>
          <form onSubmit={handleLogin} className="space-y-6 pb-8">
            <Input
                placeholder="Email или Никнейм"
                required
                className="h-16 rounded-xl bg-black/10 text-center text-lg font-bold border-white/5"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
            />
            <Button type="submit" className="w-full h-16 rounded-xl text-xl font-black bg-telegram shadow-2xl" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "ВОЙТИ"}
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}