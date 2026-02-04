import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GroupSettingsService } from '../../../settings/services/group-settings.service';
import { Popover } from 'primeng/popover';
import {
  BasketScheduleService,
  BasketScheduleCalendar,
  VoteStatus,
  BasketSchedulePreparer,
  BasketScheduleConfig,
} from '../../services/basket-schedule.service';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = Sunday
const WEEKDAY_LABELS_CA = ['Dg', 'Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds'];

interface DayCell {
  dateStr: string | null;
  dayOfMonth: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-basket-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    DatePickerModule,
    PopoverModule,
    SelectModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './basket-calendar-page.component.html',
  styleUrl: './basket-calendar-page.component.scss',
})
export class BasketCalendarPageComponent implements OnInit {
  protected readonly scheduleService = inject(BasketScheduleService);
  protected readonly groupService = inject(ConsumerGroupService);
  protected readonly authService = inject(AuthService);
  protected readonly groupSettingsService = inject(GroupSettingsService);
  private readonly messageService = inject(MessageService);

  protected readonly currentYear = signal(new Date().getFullYear());
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly calendar = signal<BasketScheduleCalendar | null>(null);
  protected readonly preparers = signal<BasketSchedulePreparer[]>([]);
  /** Managers + preparers (for "add vote" overlay). */
  protected readonly eligibleMembers = signal<{ userEmail: string; name?: string }[]>([]);
  protected readonly loading = signal(false);
  protected readonly savingVote = signal<string | null>(null);
  protected readonly savingAssignment = signal<string | null>(null);
  protected readonly savingClearVote = signal<{ date: string; userEmail: string } | null>(null);
  protected readonly savingVoteForUser = signal<{ dateStr: string; userEmail: string } | null>(null);
  protected readonly config = signal<BasketScheduleConfig | null>(null);
  protected readonly addVotePopover = viewChild<Popover>('addVotePopover');
  /** Date for which we're showing "add vote for person" overlay (manager only). */
  protected readonly addVoteForDate = signal<string | null>(null);
  protected readonly configPreferredWeekday = signal<number | null>(null);
  /** Time as Date (only HH:mm used); for PrimeNG time picker */
  protected readonly configPreferredTimeDate = signal<Date | null>(null);
  protected readonly savingConfig = signal(false);

  protected readonly isManager = computed(() => this.groupService.isManager());
  protected readonly currentUserEmail = computed(
    () => this.authService.currentUser()?.email ?? ''
  );

  protected readonly monthLabel = computed(() => {
    const d = new Date(this.currentYear(), this.currentMonth() - 1, 1);
    return d.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
  });

  protected readonly weekdays = WEEKDAY_LABELS_CA;

  protected readonly grid = computed<DayCell[][]>(() => {
    const y = this.currentYear();
    const m = this.currentMonth();
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: DayCell[] = [];
    const padding = startWeekday;
    for (let i = 0; i < padding; i++) {
      cells.push({ dateStr: null, dayOfMonth: null, isCurrentMonth: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cellDate = new Date(y, m - 1, d);
      cellDate.setHours(0, 0, 0, 0);
      cells.push({
        dateStr,
        dayOfMonth: d,
        isCurrentMonth: true,
        isToday: cellDate.getTime() === today.getTime(),
      });
    }
    const remainder = cells.length % 7;
    const trailing = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < trailing; i++) {
      cells.push({ dateStr: null, dayOfMonth: null, isCurrentMonth: false, isToday: false });
    }

    const rows: DayCell[][] = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(cells.slice(r, r + 7));
    }
    return rows;
  });

  protected readonly votesByDate = computed(() => {
    const cal = this.calendar();
    if (!cal) return new Map<string, { userEmail: string; userName?: string; status: VoteStatus }[]>();
    const map = new Map<string, { userEmail: string; userName?: string; status: VoteStatus }[]>();
    for (const v of cal.votes) {
      const list = map.get(v.date) ?? [];
      list.push({ userEmail: v.userEmail, userName: v.userName, status: v.status });
      map.set(v.date, list);
    }
    return map;
  });

  protected readonly assignmentByDate = computed(() => {
    const cal = this.calendar();
    if (!cal) return new Map<string, { email: string; name?: string }>();
    const map = new Map<string, { email: string; name?: string }>();
    for (const a of cal.assignments) {
      map.set(a.date, { email: a.assignedUserEmail, name: a.assignedUserName });
    }
    return map;
  });

  protected readonly preparerOptions = computed(() => {
    const preps = this.preparers();
    return preps
      .filter((p) => (p.name || p.userEmail || '').trim() !== 'Test')
      .map((p) => ({ label: p.name || p.userEmail, value: p.userEmail }));
  });

  /** Options for "add vote yes" overlay: managers + preparers, excluding those who already voted that day. */
  protected readonly addVotePersonOptions = computed(() => {
    const eligible = this.eligibleMembers();
    const dateStr = this.addVoteForDate();
    const votesByDate = this.votesByDate();
    const alreadyVoted = dateStr ? (votesByDate.get(dateStr) ?? []).map((v) => v.userEmail.toLowerCase()) : [];
    return eligible
      .filter((m) => !alreadyVoted.includes(m.userEmail.toLowerCase()))
      .filter((m) => (m.name || m.userEmail || '').trim() !== 'Test')
      .map((m) => ({ label: m.name || m.userEmail, value: m.userEmail }));
  });

  async ngOnInit() {
    await this.load();
    if (this.isManager()) {
      await this.loadPreparers();
      await this.loadEligibleMembers();
      await this.loadConfig();
    }
  }

  protected async load() {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;
    this.loading.set(true);
    try {
      const cal = await this.scheduleService.getCalendar(
        this.currentYear(),
        this.currentMonth()
      );
      this.calendar.set(cal);
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant el calendari',
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPreparers() {
    try {
      const list = await this.scheduleService.getPreparers();
      this.preparers.set(list);
    } catch {
      this.preparers.set([]);
    }
  }

  private async loadEligibleMembers() {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this.eligibleMembers.set([]);
      return;
    }
    try {
      const members = await this.groupSettingsService.getGroupMembers(groupId);
      const eligible = members
        .filter((m) => m.isManager || m.isPreparer)
        .map((m) => ({
          userEmail: m.userEmail,
          name: [m.name, m.surname].filter(Boolean).join(' ') || m.userEmail,
        }));
      this.eligibleMembers.set(eligible);
    } catch {
      this.eligibleMembers.set([]);
    }
  }

  private static timeStringToDate(s: string | null): Date | null {
    if (!s?.trim()) return null;
    const [h, m] = s.trim().split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(1970, 0, 1, h, m, 0, 0);
    return d;
  }

  private static dateToTimeString(d: Date | null): string | null {
    if (!d) return null;
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private async loadConfig() {
    try {
      const c = await this.scheduleService.getConfig();
      this.config.set(c);
      this.configPreferredWeekday.set(c.preferredWeekday);
      this.configPreferredTimeDate.set(
        BasketCalendarPageComponent.timeStringToDate(c.preferredTime ?? null)
      );
    } catch {
      this.config.set(null);
    }
  }

  protected async saveConfig() {
    this.savingConfig.set(true);
    try {
      await this.scheduleService.updateConfig({
        preferredWeekday: this.configPreferredWeekday(),
        preferredTime: BasketCalendarPageComponent.dateToTimeString(
          this.configPreferredTimeDate()
        ),
      });
      await this.loadConfig();
      this.messageService.add({
        severity: 'success',
        summary: 'Guardat',
        detail: 'Configuració desada',
      });
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error desant la configuració',
      });
    } finally {
      this.savingConfig.set(false);
    }
  }

  protected prevMonth() {
    let y = this.currentYear();
    let m = this.currentMonth() - 1;
    if (m < 1) {
      m = 12;
      y--;
    }
    this.currentYear.set(y);
    this.currentMonth.set(m);
    this.load();
  }

  protected nextMonth() {
    let y = this.currentYear();
    let m = this.currentMonth() + 1;
    if (m > 12) {
      m = 1;
      y++;
    }
    this.currentYear.set(y);
    this.currentMonth.set(m);
    this.load();
  }

  protected getVotes(dateStr: string) {
    return this.votesByDate().get(dateStr) ?? [];
  }

  protected getAssignment(dateStr: string) {
    return this.assignmentByDate().get(dateStr);
  }

  protected getMyVote(dateStr: string): VoteStatus | null {
    const email = this.currentUserEmail();
    const votes = this.getVotes(dateStr);
    const mine = votes.find((v) => v.userEmail.toLowerCase() === email.toLowerCase());
    return mine?.status ?? null;
  }

  protected async setVote(dateStr: string, status: VoteStatus, userEmail?: string) {
    if (userEmail) {
      this.savingVoteForUser.set({ dateStr, userEmail });
    } else {
      this.savingVote.set(dateStr);
    }
    try {
      await this.scheduleService.setVote(dateStr, status, userEmail);
      await this.load();
      if (userEmail) {
        this.addVotePopover()?.hide();
        this.addVoteForDate.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Vot afegit',
          detail: `S'ha posat vot "Sí" per a aquest dia`,
        });
      }
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error desant el vot',
      });
    } finally {
      this.savingVote.set(null);
      this.savingVoteForUser.set(null);
    }
  }

  protected async onAssignmentChange(dateStr: string, email: string | null) {
    if (email === null || email === undefined) {
      await this.clearAssignment(dateStr);
      return;
    }
    await this.setAssignment(dateStr, email);
  }

  protected async setAssignment(dateStr: string, email: string) {
    this.savingAssignment.set(dateStr);
    try {
      await this.scheduleService.setAssignment(dateStr, email);
      await this.load();
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error desant l\'assignació',
      });
    } finally {
      this.savingAssignment.set(null);
    }
  }

  protected async clearAssignment(dateStr: string) {
    this.savingAssignment.set(dateStr);
    try {
      await this.scheduleService.clearAssignment(dateStr);
      await this.load();
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error treient l\'assignació',
      });
    } finally {
      this.savingAssignment.set(null);
    }
  }

  /** Manager: remove a user's vote for a date. */
  protected async clearVoteForUser(dateStr: string, userEmail: string) {
    this.savingClearVote.set({ date: dateStr, userEmail });
    try {
      await this.scheduleService.clearVote(dateStr, userEmail);
      await this.load();
      this.messageService.add({
        severity: 'success',
        summary: 'Vot esborrat',
        detail: 'El vot s\'ha tret del calendari',
      });
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error esborrant el vot',
      });
    } finally {
      this.savingClearVote.set(null);
    }
  }

  protected isClearingVote(dateStr: string, userEmail: string): boolean {
    const s = this.savingClearVote();
    return s !== null && s.date === dateStr && s.userEmail === userEmail;
  }

  protected voteLabel(status: VoteStatus): string {
    return status === 'yes' ? 'basketCalendar.yes' : status === 'no' ? 'basketCalendar.no' : 'basketCalendar.ifNeeded';
  }

  /** Manager: click on day cell (not on a person/badge/button) opens overlay to add vote "yes" for a person. */
  protected onDayCellClick(event: MouseEvent, dateStr: string) {
    if (!this.isManager() || !dateStr) return;
    this.addVoteForDate.set(dateStr);
    this.addVotePopover()?.toggle(event);
  }

  protected isSavingVoteForUser(dateStr: string, userEmail: string): boolean {
    const s = this.savingVoteForUser();
    return s !== null && s.dateStr === dateStr && s.userEmail === userEmail;
  }

  protected readonly preferredWeekdayOptions = [
    { label: 'Diumenge', value: 0 },
    { label: 'Dilluns', value: 1 },
    { label: 'Dimarts', value: 2 },
    { label: 'Dimecres', value: 3 },
    { label: 'Dijous', value: 4 },
    { label: 'Divendres', value: 5 },
    { label: 'Dissabte', value: 6 },
  ];

  get configWeekdayValue(): number | null {
    return this.configPreferredWeekday();
  }
  set configWeekdayValue(v: number | null) {
    this.configPreferredWeekday.set(v);
  }
  get configTimeDateValue(): Date | null {
    return this.configPreferredTimeDate();
  }
  set configTimeDateValue(v: Date | null) {
    this.configPreferredTimeDate.set(v);
  }
}
