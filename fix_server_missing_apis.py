import re

with open('server.ts', 'r') as f:
    code = f.read()

# I will add the endpoints right before the vite middleware
mock_endpoints = """
  app.get('/api/places', (req, res) => {
    res.json([
      { id: 1, name: "کافه کتاب انقلاب", type: "کافه", address: "میدان انقلاب", lat: 35.700, lng: 51.391, imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" },
      { id: 2, name: "پارک لاله", type: "پارک", address: "بلوار کشاورز", lat: 35.706, lng: 51.394 }
    ]);
  });
  
  app.get('/api/places/:id', (req, res) => {
    res.json({ id: parseInt(req.params.id), name: "کافه کتاب انقلاب", type: "کافه", address: "میدان انقلاب", lat: 35.700, lng: 51.391, description: "یک کافه دنج با کتاب‌های متنوع", workingHours: "۸ صبح تا ۱۱ شب", events: [] });
  });

  app.get('/api/vibes', (req, res) => {
    res.json([
      { id: 1, title: "قدم زدن در ولیعصر", name: "قدم زدن در ولیعصر", description: "تجربه قدم زدن زیر درختان چنار", areaName: "ولیعصر", polygon: [{lat: 35.701, lng: 51.408}, {lat: 35.705, lng: 51.408}], imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1" }
    ]);
  });

  app.get('/api/vibes/:id', (req, res) => {
    res.json({ id: parseInt(req.params.id), name: "قدم زدن در ولیعصر", description: "تجربه قدم زدن زیر درختان چنار طولانی ترین خیابان خاورمیانه", bestTime: "عصرها", areaName: "ولیعصر" });
  });

  app.get('/api/chains', (req, res) => {
    res.json([
      { id: 1, name: "فستیوال فیلم کوتاه", description: "نمایش فیلم‌های کوتاه از کارگردانان جوان", coverImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba" }
    ]);
  });

  app.get('/api/chains/:id', (req, res) => {
    res.json({ id: parseInt(req.params.id), name: "فستیوال فیلم کوتاه", description: "این زنجیره شامل رویدادهای مختلفی است", events: [] });
  });

  app.get('/api/flows', (req, res) => {
    res.json([
      { id: 1, title: "برای گیمرها", name: "برای گیمرها", description: "رویدادها و پاتوق‌های مناسب گیمرها", tag: "گیم", coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e" }
    ]);
  });
"""

code = code.replace(
    "  // Vite middleware for development",
    mock_endpoints + "\n  // Vite middleware for development"
)

with open('server.ts', 'w') as f:
    f.write(code)
