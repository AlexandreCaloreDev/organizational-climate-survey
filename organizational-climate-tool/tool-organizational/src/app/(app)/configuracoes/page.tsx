"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authService } from '@/lib/services/authService';
import { useAuth } from '@/context/AuthContext';

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!senhaAtual || !novaSenha) {
      toast.error('Preencha os campos de senha.');
      return;
    }
    if (novaSenha.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(novaSenha)) {
      toast.error('A nova senha deve conter pelo menos 1 letra maiúscula.');
      return;
    }
    if (!/[0-9]/.test(novaSenha)) {
      toast.error('A nova senha deve conter pelo menos 1 número.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }
    try {
      setIsSubmitting(true);
      await authService.changePassword(senhaAtual, novaSenha);
      toast.success('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      toast.error('Erro ao alterar a senha. Tente novamente.');
      console.error('changePassword error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">
        Configurações
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Gerencie as configurações da sua conta e do sistema.
      </p>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Atualize as informações do seu perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" defaultValue={user?.nome || ''} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} />
            </div>
            <Button>Salvar alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Altere sua senha e outras configurações de segurança.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="senhaAtual">Senha Atual</Label>
              <Input id="senhaAtual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="novaSenha">Nova Senha</Label>
              <Input id="novaSenha" type="password" placeholder="Mínimo de 8 caracteres, 1 maiúscula, 1 número" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
              <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
              {confirmarSenha && novaSenha !== confirmarSenha && (
                <span className="text-sm text-red-500 font-medium">As senhas não coincidem.</span>
              )}
            </div>
            <Button onClick={onSubmit} disabled={isSubmitting || (confirmarSenha.length > 0 && novaSenha !== confirmarSenha)}>
              {isSubmitting ? 'Enviando...' : 'Alterar Senha'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Gerencie suas preferências de notificação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adicionar componentes de checkbox ou switch para notificações */}
            <p>Em breve...</p>
            <Button>Salvar preferências</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
