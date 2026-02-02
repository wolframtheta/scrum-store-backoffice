import { Injectable, inject, signal } from '@angular/core';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { ApiService } from '../../../core/services/api.service';

export interface InvitationData {
  consumerGroupId: string;
  invitedEmail?: string;
  isManager?: boolean;
  isClient?: boolean;
  isPreparer?: boolean;
  expirationDays?: number;
}

export interface Invitation {
  id: string;
  token: string;
  consumerGroupId: string;
  invitedBy: string;
  invitedEmail?: string;
  isManager: boolean;
  isClient: boolean;
  isPreparer: boolean;
  expiresAt?: Date;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
  createdAt: Date;
}

export interface InvitationValidation {
  valid: boolean;
  groupName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private readonly api = inject(ApiService);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async createInvitation(groupId: string, data: Omit<InvitationData, 'consumerGroupId'>): Promise<Invitation> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.post<Invitation>(`consumer-groups/${groupId}/invitations`, data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error creant invitació'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async validateInvitation(token: string): Promise<InvitationValidation> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.get<InvitationValidation>(`consumer-groups/invitations/${token}/validate`);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error validant invitació'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  generateInvitationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?token=${token}`;
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback per navegadors antics
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  generateWhatsAppLink(invitationLink: string, groupName: string): string {
    const message = encodeURIComponent(
      `T'he convidat a unir-te al grup de consum "${groupName}"! 🌱\n\nRegistra't aquí: ${invitationLink}`
    );
    return `https://wa.me/?text=${message}`;
  }

  generateEmailLink(invitationLink: string, groupName: string): string {
    const subject = encodeURIComponent(`Invitació al grup de consum ${groupName}`);
    const body = encodeURIComponent(
      `Hola!\n\nT'he convidat a unir-te al nostre grup de consum "${groupName}".\n\nPer registrar-te, simplement fes clic en aquest enllaç:\n${invitationLink}\n\nEns veiem aviat!`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }
}

