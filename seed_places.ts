import 'dotenv/config';
import { db } from './src/db/index.ts';
import { places } from './src/db/schema.ts';

const placesData = [
  { name: "کافه گودو یاس", type: "کافه", address: "خیابان نجات‌اللهی (ویلا)، بن‌بست یاس", lat: 35.7065, lng: 51.4173, workingHours: "۸ صبح تا ۱۱:۳۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "عمارت روبرو", type: "کافه", address: "خیابان انقلاب، بن‌بست کیانپور", lat: 35.7011, lng: 51.4035, workingHours: "۹ صبح تا ۱۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه دیاموند", type: "کافه", address: "خیابان انقلاب، خیابان نجات‌اللهی", lat: 35.7051, lng: 51.4170, workingHours: "۸ صبح تا ۱۲ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه نزدیک کتاب", type: "کافه", address: "خیابان کریمخان، بین ایرانشهر و ماهشهر", lat: 35.7145, lng: 51.4201, workingHours: "۸:۳۰ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه تهرون", type: "کافه", address: "خیابان ویلا، کوچه خسرو", lat: 35.7082, lng: 51.4168, workingHours: "۹ صبح تا ۱۰:۳0 شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "بوستان لاله", type: "پارک", address: "بلوار کشاورز", lat: 35.7125, lng: 51.3963, workingHours: "۲۴ ساعته", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "پارک دانشجو", type: "پارک", address: "چهارراه ولیعصر", lat: 35.7015, lng: 51.4012, workingHours: "۲۴ ساعته", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه حیاط شماره ۶۵", type: "کافه", address: "میدان فردوسی، خیابان موسوی", lat: 35.7032, lng: 51.4215, workingHours: "۹ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "باغ فردوس", type: "موزه", address: "خیابان ولیعصر، نرسیده به تجریش", lat: 35.8021, lng: 51.4234, workingHours: "۹ صبح تا ۱۲ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه سینما", type: "کافه", address: "موزه سینما، باغ فردوس", lat: 35.8023, lng: 51.4236, workingHours: "۱۰ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "خانه هنرمندان", type: "مرکز فرهنگی", address: "پارک هنرمندان، خیابان ایرانشهر", lat: 35.7102, lng: 51.4178, workingHours: "۱۰ صبح تا ۱۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه پراگ", type: "کافه", address: "بلوار کشاورز", lat: 35.7100, lng: 51.3950, workingHours: "۸ صبح تا ۱۱:۳۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "موزه هنرهای معاصر", type: "موزه", address: "خیابان کارگر شمالی، پارک لاله", lat: 35.7142, lng: 51.3892, workingHours: "۹ صبح تا ۶ عصر", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "تئاتر شهر", type: "تئاتر", address: "چهارراه ولیعصر", lat: 35.7011, lng: 51.4011, workingHours: "۱۰ صبح تا ۱۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه لمیز چهارراه ولیعصر", type: "کافه", address: "ضلع شمال شرقی چهارراه ولیعصر", lat: 35.7020, lng: 51.4018, workingHours: "۷ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "سام کافه سنایی", type: "کافه", address: "کریمخان، خیابان سنایی", lat: 35.7185, lng: 51.4150, workingHours: "۸ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کافه موزه مقدم", type: "کافه", address: "خیابان امام خمینی، بعد از شیخ هادی", lat: 35.6852, lng: 51.4010, workingHours: "۹ صبح تا ۵ عصر", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "کتابفروشی چشمه کوروش", type: "کتابفروشی", address: "بزرگراه ستاری، مجتمع کوروش", lat: 35.7420, lng: 51.3100, workingHours: "۱۱ صبح تا ۱۱ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "فودکورت پل طبیعت", type: "فودکورت", address: "پل طبیعت", lat: 35.7538, lng: 51.4190, workingHours: "۱۰ صبح تا ۱۲ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
  { name: "شهر کتاب مرکزی", type: "کتابفروشی", address: "خیابان شریعتی، بالاتر از مطهری", lat: 35.7335, lng: 51.4420, workingHours: "۹ صبح تا ۱۰ شب", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" }
];

async function run() {
  await db.insert(places).values(placesData);
  console.log("Inserted 20 places");
  process.exit(0);
}
run();
