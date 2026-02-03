declare module 'lunar-javascript' {
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromDate(date: Date): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getSolar(): Solar;
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }

  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
    toYmd(): string;
  }
}
