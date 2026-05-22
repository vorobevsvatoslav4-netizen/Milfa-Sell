import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Globe, Clock, Search, Loader2, Info, ChevronRight, AlertCircle, Wallet } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { TelegramAccount } from '@shared/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES_RUS } from '@/lib/constants';
import { useUserStore } from '@/store/userStore';
const getFlagEmoji = (countryCode?: string) => {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'RU': '🇷🇺', 'NL': '🇳🇱',
    'KZ': '🇰🇿', 'UA': '🇺🇦', 'BY': '🇧🇾', 'ID': '🇮🇩', 'FR': '🇫🇷',
    'PL': '🇵🇱', 'CA': '🇨🇦'
  };
  return flags[countryCode || ''] || '🏳️';
};
export function StorePage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [confirmAccount, setConfirmAccount] = useState<TelegramAccount | null>(null);
  const hasUser = useUserStore(state => !!state.user);
  const userBalance = useUserStore(state => state.user?.balance ?? 0);
  const userEmail = useUserStore(state => state.user?.email);
  const updateBalance = useUserStore(state => state.updateBalance);
  const addPurchase = useUserStore(state => state.addPurchase);
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api<{ items: TelegramAccount[] }>('/api/accounts');
      setAccounts(res.items || []);
    } catch (error) {
      toast.error('Ошибка загрузки аккаунтов');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  const handlePurchase = async () => {
    if (!confirmAccount || !userEmail) return;
    const accountId = confirmAccount.id;
    const accountPrice = Number(confirmAccount.price);
    setBuyingId(accountId);
    setConfirmAccount(null);
    try {
      await api('/api/accounts/buy', {
        method: 'POST',
        body: JSON.stringify({ email: userEmail, accountId })
      });
      updateBalance(userBalance - accountPrice);
      addPurchase(accountId);
      toast.success('Покупка успешна!', {
        description: 'Аккаунт добавлен в ваш профиль.',
        action: { label: 'Просмотр', onClick: () => navigate('/profile') }
      });
      fetchAccounts();
    } catch (err: any) {
      if (err.message?.includes('ERR_LOW_BALANCE')) {
        toast.error('Недостаточно средств', {
          description: 'Пожалуйста, пополните баланс.',
          action: { label: 'Пополнить', onClick: () => navigate('/profile') }
        });
      } else {
        toast.error(err.message || 'Ошибка покупки');
      }
    } finally {
      setBuyingId(null);
    }
  };
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchesFilter = filter === 'All' || acc.category === filter;
      const term = search.toLowerCase();
      const matchesSearch = (acc.country?.toLowerCase() || '').includes(term) ||
                            (acc.description?.toLowerCase() || '').includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [accounts, filter, search]);
  return (
    <AppLayout>
      <div className="flex flex-col space-y-10 mb-16 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">Маркетплейс</h1>
            <p className="text-muted-foreground text-sm sm:text-lg font-medium opacity-80">Качественные сессии для безопасной работы.</p>
          </div>
          {hasUser && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-5 glass-effect p-6 rounded-[2rem] zen-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><Wallet className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Баланс</p>
                <p className="text-2xl font-display font-black text-primary text-glow">${Number(userBalance).toFixed(2)}</p>
              </div>
            </motion.div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Поиск по стране..."
              className="pl-14 h-14 rounded-2xl bg-white/[0.03] border-border text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button variant={filter === 'All' ? "default" : "outline"} onClick={() => setFilter('All')} className={cn("rounded-2xl px-6 h-14 font-bold shrink-0", filter === 'All' ? "bg-telegram text-white" : "bg-card")}>Все</Button>
            {Object.entries(CATEGORIES_RUS).filter(([k]) => k !== 'All').map(([k, v]) => (
              <Button key={k} variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)} className={cn("rounded-2xl px-6 h-14 font-bold shrink-0", filter === k ? "bg-telegram text-white" : "bg-card")}>{v}</Button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-[420px] rounded-[3rem] bg-muted animate-pulse border border-border" />)}
          </div>
        ) : filteredAccounts.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAccounts.map((acc) => (
                <motion.div key={acc.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card className="h-full flex flex-col border-border hover:border-primary/40 transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card shadow-md">
                    <CardHeader className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl">{getFlagEmoji(acc.countryCode)}</span>
                          <Badge className="bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest">{CATEGORIES_RUS[acc.category as keyof typeof CATEGORIES_RUS] || acc.category}</Badge>
                        </div>
                        <div className="text-3xl font-display font-black text-primary text-glow">${Number(acc.price).toFixed(2)}</div>
                      </div>
                      <CardTitle className="text-2xl font-black">Telegram Account</CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 space-y-6 flex-1">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-muted/50 px-4 py-2.5 rounded-xl border border-border"><Globe className="h-3.5 w-3.5 text-primary" />{acc.country}</div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-muted/50 px-4 py-2.5 rounded-xl border border-border"><Clock className="h-3.5 w-3.5 text-primary" />{acc.age}</div>
                      </div>
                      {acc.description && (
                        <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground break-words">
                          {acc.description}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="p-8">
                      <Button className="w-full h-16 rounded-2xl text-lg font-black bg-telegram text-white shadow-xl hover:scale-[1.02]" onClick={() => { if (!hasUser) { toast.error('Нужна авторизация'); navigate('/auth'); return; } setConfirmAccount(acc); }} disabled={buyingId === acc.id}>
                        {buyingId === acc.id ? <Loader2 className="animate-spin" /> : <><ShoppingCart className="mr-3 h-5 w-5" /> Купить</>}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-32 rounded-[4rem] border-2 border-dashed border-border bg-card">
            <AlertCircle className="h-20 w-20 text-muted-foreground/30 mx-auto mb-8" />
            <h3 className="text-3xl font-display font-black mb-4">Магазин пуст</h3>
            <Button variant="outline" onClick={() => {setFilter('All'); setSearch('')}} className="rounded-2xl px-10 h-14 font-bold">Сбросить фильтры</Button>
          </div>
        )}
      </div>
      <Dialog open={!!confirmAccount} onOpenChange={(open) => !open && setConfirmAccount(null)}>
        <DialogContent className="rounded-[3rem] border-border bg-card p-10 zen-shadow sm:max-w-[440px]">
          {confirmAccount && (
            <>
              <DialogHeader className="mb-8 text-left">
                <DialogTitle className="text-3xl font-black">Подтверждение</DialogTitle>
                <DialogDescription className="text-lg font-medium pt-2 text-muted-foreground">
                  Вы покупаете аккаунт за <span className="text-primary font-black">${Number(confirmAccount.price).toFixed(2)}</span>. Данная операция безвозвратна.
                </DialogDescription>
                {confirmAccount.description && (
                  <p className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground break-words">
                    {confirmAccount.description}
                  </p>
                )}
              </DialogHeader>
              <DialogFooter className="gap-4 flex-col sm:flex-row">
                <Button variant="ghost" onClick={() => setConfirmAccount(null)} className="rounded-xl h-14 font-bold text-foreground">Отмена</Button>
                <Button onClick={handlePurchase} className="rounded-xl h-14 flex-1 font-black bg-telegram text-white">Оплатить</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}