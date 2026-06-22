/**
 * Generate 35 unique HTML email templates for POD marketing
 * Writes to Template Dashboard sheet (A2:C36)
 * 
 * Run: node generate-email-templates.mjs
 */
import { getToken } from './scripts/sheets-jwt.mjs';

const SPREADSHEET_ID = '110S-gpLBJbu9nLDLOscYn3Dud0BtKqoR776kPWOvhwQ';
const RANGE = 'Template!A2:C36';

// Placeholder CTA — anh sẽ update sau
const CTA_LINK = 'https://scincestore.blogspot.com/2025/04/your-name-apparel-collection.html';
const CTA_TEXT = 'Shop Your Design Now';

// Shared HTML wrapper
function wrapHTML({ headline, intro, imgSrc, imgAlt, body, bullets, ps }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${headline.replace(/<[^>]*>/g, '')}</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f7f7f7; margin:0; padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f7f7f7">
<tr><td align="center">
<table width="600" cellpadding="20" cellspacing="0" bgcolor="#fff" style="margin-top:40px; border-radius:8px; box-shadow:0 0 8px #ccc;">
<tr><td align="left" style="padding-top:30px;">
<h1 style="color:#223e7f; font-size:28px; margin-bottom:16px;">${headline}</h1>
<p style="font-size:18px; color:#333; margin-bottom:24px;">${intro}</p>
<img src="${imgSrc}" alt="${imgAlt}" style="width:320px; border-radius:5px; margin-bottom:20px;">
${body}
${bullets ? `<ul style="font-size:16px; color:#555;">\n${bullets.map(b => `<li>${b}</li>`).join('\n')}\n</ul>` : ''}
${ps ? `<p style="font-size:16px; color:#444;">${ps}</p>` : ''}
<p style="font-size:18px; color:#223e7f; margin:24px 0;">
<a href="${CTA_LINK}" style="background:#223e7f; color:#fff; text-decoration:none; padding:12px 32px; border-radius:4px; font-weight:bold; display:inline-block;">${CTA_TEXT}</a>
</p>
<p style="font-size:15px; color:#aaa; margin-bottom:0;">
Questions? Reply to this email at <?= email ?>. 
Want to stop? <a href="<?= Unsubscribe ?>?email=<?= email ?>" style="color:#888;">Unsubscribe</a>.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const IMG = 'https://images-shopblanket-com.translate.goog/rx/-/s2/p/15930370/3f35dc77b409f8fd0679289b28a103c0.jpg';

const TEMPLATES = [
  // ===== 1-3: Badass / Confidence =====
  {
    B: 'Own Your Legacy, ',
    C: ' —Wear It With Pride',
    headline: 'Legends Wear Their Name',
    intro: '<?= name ?>, greatness isn\'t just achieved—it\'s worn. Imagine a hoodie that carries your name, your story, your legend.',
    imgAlt: 'Custom name hoodie',
    body: '<p style="font-size:16px; color:#444;">From the court to the streets, nothing says "I made it" like wearing your own name. Our premium custom hoodie collection lets you showcase exactly who you are—no labels, no logos, just you.</p>',
    bullets: ['Custom-embroidered with your name', 'Premium cotton blend — ultra-comfortable', 'All sizes, all colors, your style'],
    ps: 'Don\'t just wear clothes. Wear your identity.'
  },
  {
    B: 'They\'ll Remember the Name: ',
    C: ' —Your Story Starts Here',
    headline: 'What\'s in a Name? Everything.',
    intro: '<?= name ?> — a name that carries weight. Why hide it behind someone else\'s brand when you can wear your own?',
    imgAlt: 'Custom name hoodie',
    body: '<p style="font-size:16px; color:#444;">Your name is your brand. Your name is your reputation. Our custom apparel puts YOU front and center. No need for flashy logos when your name does all the talking.</p>',
    bullets: ['Personalized with your exact name', 'Premium quality, built to last', 'Stand out without trying too hard'],
    ps: 'Be unforgettable. Wear your name.'
  },
  {
    B: 'Make a Statement, ',
    C: ' —Because Ordinary is Overrated',
    headline: 'Don\'t Blend In. Stand Out.',
    intro: '<?= name ?>, the world is full of people wearing the same things. You\'re not one of them. Your gear should be as unique as you are.',
    imgAlt: 'Custom name hoodie style',
    body: '<p style="font-size:16px; color:#444;">Every stitch, every thread—crafted to celebrate YOUR identity. Whether it\'s a hoodie, tee, or sweatshirt, when your name is on it, it hits different.</p>',
    bullets: ['Your name, your design, your rules', 'Premium fabrics for all-day comfort', 'A conversation starter everywhere you go'],
    ps: 'Step out of the crowd. Step into your name.'
  },

  // ===== 4-6: Emotional / Meaningful =====
  {
    B: 'A Gift They\'ll Treasure, ',
    C: ' —Personalized Perfection',
    headline: 'The Gift That Says "I See You"',
    intro: 'Looking for a gift that actually means something, <?= name ?>? Nothing beats seeing your loved one\'s face light up when they see their own name on custom gear.',
    imgAlt: 'Custom name hoodie gift',
    body: '<p style="font-size:16px; color:#444;">Birthdays, holidays, milestones—give something that shows you care enough to make it personal. A custom name hoodie isn\'t just apparel. It\'s a memory they\'ll wear forever.</p>',
    bullets: ['Personalized just for them', 'Perfect for any occasion', 'Ships fast in gift-ready packaging'],
    ps: 'Make their day unforgettable.'
  },
  {
    B: 'Wear Your Story, ',
    C: ' —Every Stitch Tells It',
    headline: 'Your Name, Your Journey',
    intro: '<?= name ?>, every great story has a title. Why shouldn\'t yours be worn with pride? From where you\'ve been to where you\'re going—let your gear tell the tale.',
    imgAlt: 'Custom name hoodie personal',
    body: '<p style="font-size:16px; color:#444;">We believe what you wear should mean something. That\'s why we create custom apparel that celebrates YOUR name—the one thing nobody else has. Because you\'re not mass-produced. Neither should your style be.</p>',
    bullets: ['One-of-a-kind, just like you', 'Meaningful style that sparks conversations', 'Built to last, like your legacy'],
    ps: 'Dress for the story you\'re writing.'
  },
  {
    B: 'Finally, Apparel That Gets You, ',
    C: ' —Because You Deserve It',
    headline: 'It\'s About Time You Had This',
    intro: '<?= name ?>, you work hard. You show up. You grind. Don\'t you deserve gear that actually reflects who you are? No more blending in. No more wearing someone else\'s label.',
    imgAlt: 'Custom name premium hoodie',
    body: '<p style="font-size:16px; color:#444;">Treat yourself to something that\'s truly yours. Premium materials, perfect fit, and YOUR name front and center. Because you\'ve earned it.</p>',
    bullets: ['Premium quality that feels as good as it looks', 'Your name, your size, your color', 'Wear it with pride—you\'ve earned it'],
    ps: 'You deserve to be seen.'
  },

  // ===== 7-9: Gift Idea =====
  {
    B: 'Stuck on Gift Ideas? Try ',
    C: ' —They\'ll Love It',
    headline: 'The Ultimate Personalized Gift',
    intro: 'Let\'s be real, <?= name ?>—finding the perfect gift is hard. But a custom name hoodie? That\'s a guaranteed win. For mom, dad, bae, or BFF.',
    imgAlt: 'Custom hoodie gift',
    body: '<p style="font-size:16px; color:#444;">Forget generic gift cards and boring sweaters. Give them something they\'ll actually wear and cherish. Their name, their style, their colors. It\'s thoughtful, it\'s personal, and it\'s awesome.</p>',
    bullets: ['Unique gift they won\'t return', 'Any name, any style, any size', 'Fast shipping and easy ordering'],
    ps: 'The best gifts have names on them.'
  },
  {
    B: 'For the One Who Has Everything—Give Them ',
    C: ' —Personalized and Perfect',
    headline: 'What Do You Get Someone Who Has It All? Their Name.',
    intro: '<?= name ?>, struggling with gift shopping? Here\'s the secret: people love seeing their name on things. It\'s personal, it\'s thoughtful, and it shows you put in effort.',
    imgAlt: 'Personalized gift hoodie',
    body: '<p style="font-size:16px; color:#444;">Whether it\'s a birthday, anniversary, or just because—a custom name hoodie says "I know you, I see you, I appreciate you." And honestly? It looks fire too.</p>',
    bullets: ['Fully customizable with any name', 'Perfect for any relationship', 'They\'ll wear it and think of you'],
    ps: 'Give a gift that actually gets worn.'
  },
  {
    B: 'Gift-Giving Made Easy: ',
    C: ' —The Name Game Winner',
    headline: 'The Easiest "Yes" You\'ll Get This Year',
    intro: 'Let\'s face it, <?= name ?>—most gifts end up in a drawer somewhere. Not this one. A custom name hoodie gets worn, photographed, and bragged about.',
    imgAlt: 'Custom name gift idea',
    body: '<p style="font-size:16px; color:#444;">No more "oh, you shouldn\'t have." With personalized apparel, you\'ll get "OMG, where did you get this?!" It\'s the gift that keeps giving—every time they put it on.</p>',
    bullets: ['Starts conversations everywhere', 'Practical AND personal', 'Easy to order—hard to mess up'],
    ps: 'Be the hero of gift-giving season.'
  },

  // ===== 10-12: Quality / Comfort =====
  {
    B: 'Soft, Warm, and Yours: ',
    C: ' —Premium Comfort Delivered',
    headline: 'Quality You Can Feel. A Name You Can Claim.',
    intro: '<?= name ?>, we\'re not about cheap prints and scratchy fabrics. Every piece is crafted with premium materials because your name deserves the best.',
    imgAlt: 'Premium hoodie quality',
    body: '<p style="font-size:16px; color:#444;">Premium ringspun cotton. Reinforced stitching. Colors that stay vibrant wash after wash. And your name, embroidered with precision. This isn\'t fast fashion—it\'s heirloom quality.</p>',
    bullets: ['Ultra-soft 8oz cotton blend', 'Name embroidered, not just printed', 'Machine washable, colors stay bright'],
    ps: 'Quality that matches your name\'s reputation.'
  },
  {
    B: 'Feel the Difference with ',
    C: ' —Premium Feel, Personal Style',
    headline: 'Your Name Deserves the Best Fabric',
    intro: '<?= name ?>, you can tell when something is well-made. The weight of the fabric. The feel of the embroidery. The fit that\'s just right. That\'s what we deliver.',
    imgAlt: 'Premium quality hoodie',
    body: '<p style="font-size:16px; color:#444;">We don\'t cut corners. From the thread we use to the way we package your order—everything is designed to exceed expectations. Your name is on it. Make sure it\'s quality.</p>',
    bullets: ['Heavyweight cotton for lasting comfort', 'Reinforced seams that won\'t quit', 'Custom-fit options available'],
    ps: 'Once you feel the quality, you\'ll never go back.'
  },
  {
    B: 'Not All Hoodies Are Equal—Try ',
    C: ' —Experience the Difference',
    headline: 'This Isn\'t Your Average Hoodie',
    intro: 'We know what you\'re thinking: "Another custom hoodie site." But <?= name ?>, trust us—this is different. From the moment you put it on, you\'ll feel it.',
    imgAlt: 'Quality custom hoodie',
    body: '<p style="font-size:16px; color:#444;">The fabric is heavier. The embroidery is cleaner. The fit is better. We obsess over details so you don\'t have to think about them. You just wear it and own it.</p>',
    bullets: ['Professional-grade embroidery', 'Pre-shrunk fabric—fit stays true', 'Double-stitched for durability'],
    ps: 'Finally, a hoodie that lives up to your name.'
  },

  // ===== 13-15: Identity / Self-Expression =====
  {
    B: 'Your Identity, Your Style: ',
    C: ' —Wear What Defines You',
    headline: 'Define Yourself. Don\'t Let Brands Do It.',
    intro: '<?= name ?>, why let some corporation define your style when you can define it yourself? Your name. Your identity. Your rules.',
    imgAlt: 'Self-expression hoodie',
    body: '<p style="font-size:16px; color:#444;">Fashion should be personal. Not dictated by what\'s trending or what celebrities wear. When you wear your name, you\'re making a statement: "I don\'t follow. I lead."</p>',
    bullets: ['Express yourself without saying a word', 'Your name becomes your logo', 'Style that\'s authentically YOU'],
    ps: 'Be your own brand.'
  },
  {
    B: 'The Name You\'ve Built: ',
    C: ' —Let the World See It',
    headline: 'You\'ve Made a Name for Yourself. Now Wear It.',
    intro: '<?= name ?>, whether it\'s in your career, your family, or your community—you\'ve built something. Your name means something. Let the world see what it stands for.',
    imgAlt: 'Custom name identity',
    body: '<p style="font-size:16px; color:#444;">There\'s power in owning who you are. When you wear your name, you\'re not just making a fashion choice—you\'re making a declaration. This is who I am. And I\'m proud of it.</p>',
    bullets: ['Celebrate your achievements', 'Inspire others who see you', 'Wear your success literally'],
    ps: 'Your name is your greatest accessory.'
  },
  {
    B: 'Unique as You Are: ',
    C: ' —One Name, Infinite Style',
    headline: 'Why Wear Someone Else\'s Name?',
    intro: 'Think about it, <?= name ?>. You walk into a room full of people wearing Nike, Adidas, and Supreme. Everyone\'s wearing the same thing. Except you. You\'re wearing YOUR name.',
    imgAlt: 'Unique custom hoodie',
    body: '<p style="font-size:16px; color:#444;">In a world of clones, be the original. Our custom apparel isn\'t just about looking good—it\'s about being authentically, unapologetically you. No logos needed.</p>',
    bullets: ['Zero logos, 100% you', 'Stand out in any crowd', 'The most unique piece in your wardrobe'],
    ps: 'Be the original, not the copy.'
  },

  // ===== 16-18: Humorous / Fun =====
  {
    B: 'Let\'s Be Honest, ',
    C: ' —You Know You Want One',
    headline: 'Okay Fine, You Caught Us. This Email is About a Hoodie.',
    intro: 'But <?= name ?>, not just ANY hoodie. A hoodie with YOUR NAME on it. Come on. You know that\'s cool. Don\'t pretend you don\'t.',
    imgAlt: 'Fun custom hoodie',
    body: '<p style="font-size:16px; color:#444;">Look, we could write a long fancy email about self-expression and premium fabrics (and we did—see the other emails). But really? It\'s a hoodie with your name. And it looks awesome. Just saying.</p>',
    bullets: ['It\'s got your name on it (literally)', 'It\'s comfy (like, really comfy)', 'You\'ll get compliments (we promise)'],
    ps: 'Go ahead. You deserve it. Treat yo\' self.'
  },
  {
    B: 'PSA: ',
    C: ' —Named Hoodie = Instant Cool',
    headline: 'Warning: Wearing Your Name May Cause Excessive Compliments',
    intro: 'Side effects of owning a <?= name ?> custom hoodie include: increased confidence, frequent compliments, and the inability to take it off because it\'s too comfortable.',
    imgAlt: 'Cool custom hoodie',
    body: '<p style="font-size:16px; color:#444;">Doctor\'s orders: everyone needs at least one piece of clothing with their name on it. It\'s scientifically proven to boost mood by at least 47% (okay, we made that up, but trust us—it feels amazing).</p>',
    bullets: ['Doctor-recommended (not really, but still)', '100% chance of looking good', 'Zero side effects (except awesomeness)'],
    ps: 'This is not a drill. Get your named hoodie now.'
  },
  {
    B: 'Question: ',
    C: ' —Answer: Yes, It\'s as Cool as It Sounds',
    headline: 'Ever Wanted to See Your Name on Something Awesome?',
    intro: '<?= name ?>, we have a feeling the answer is yes. And we have just the thing: a premium hoodie with YOUR NAME emblazoned on it. Boom. Problem solved.',
    imgAlt: 'Fun name hoodie',
    body: '<p style="font-size:16px; color:#444;">It\'s like those personalized keychains from the mall, but way cooler. And you can actually wear it. And people will be like "wait, that has YOUR name on it?!" Yes. Yes it does.</p>',
    bullets: ['Way better than a keychain', 'Actually useful (keeps you warm)', 'Makes a great conversation starter'],
    ps: 'Spoiler alert: you\'re going to love it.'
  },

  // ===== 19-21: Exclusive / Limited =====
  {
    B: 'Don\'t Miss Out, ',
    C: ' —Limited Drops Available',
    headline: 'Limited Edition. Your Name. Get It While You Can.',
    intro: '<?= name ?>, we\'re not going to sell these forever. Each batch is produced in limited quantities to maintain quality. When they\'re gone, they\'re gone.',
    imgAlt: 'Limited edition hoodie',
    body: '<p style="font-size:16px; color:#444;">We believe in quality over quantity. That means we produce in small batches, ensuring every piece meets our standards. The downside? They sell out fast. Don\'t sleep on this.</p>',
    bullets: ['Limited production run', 'Premium quality control on every piece', 'Once sold out, may not return'],
    ps: 'Secure yours before they\'re history.'
  },
  {
    B: 'Last Chance for ',
    C: ' —Inventory Moving Fast',
    headline: 'We\'re Running Low on Your Size',
    intro: 'Just a heads up, <?= name ?>—popular sizes and colors are selling quickly. We don\'t want you to miss out on wearing your name in style.',
    imgAlt: 'Limited stock hoodie',
    body: '<p style="font-size:16px; color:#444;">When custom products are in demand, sizes go fast. We restock based on demand, but there\'s no guarantee your preferred size will be available next round. Grab it now while we\'ve got it.</p>',
    bullets: ['Popular sizes selling fast', 'Custom embroidery takes time—order early', 'Don\'t settle for "almost perfect"'],
    ps: 'Your size might not wait. Order today.'
  },
  {
    B: 'Exclusive Access: ',
    C: ' —You\'re on the List',
    headline: 'You\'ve Been Selected for Early Access',
    intro: '<?= name ?>, you\'re getting this email because you\'re part of our exclusive list. Before we open this to everyone, we wanted you to have first dibs on custom name apparel.',
    imgAlt: 'Exclusive hoodie access',
    body: '<p style="font-size:16px; color:#444;">Early access means you get first pick of sizes, colors, and styles before the general public. Plus, as a valued subscriber, you\'ll get priority processing on your order.</p>',
    bullets: ['Early access to new designs', 'Priority order processing', 'Exclusive subscriber pricing'],
    ps: 'Welcome to the inner circle.'
  },

  // ===== 22-24: New Arrival / Trending =====
  {
    B: 'Hot Off the Press: ',
    C: ' —Fresh Drops Just Landed',
    headline: 'New Colors, New Styles—Same Legendary Quality',
    intro: '<?= name ?>, we\'ve been cooking. Fresh inventory just dropped with new colors and styles that look incredible with custom names. Check out what\'s new.',
    imgAlt: 'New arrival hoodie',
    body: '<p style="font-size:16px; color:#444;">From classic black and white to bold new tones—there\'s never been a better time to get your name on premium apparel. Extended size range too, from XS to 5XL.</p>',
    bullets: ['Brand new color options', 'Extended size range available', 'Fresh stock—no delays'],
    ps: 'New arrivals going fast.'
  },
  {
    B: 'Trending Now: ',
    C: ' —Everyone\'s Getting One',
    headline: 'Why Everyone Is Rocking Custom Name Gear',
    intro: '<?= name ?>, have you noticed? Personalized apparel is taking over. From influencers to athletes, everyone\'s embracing the power of wearing their own name.',
    imgAlt: 'Trending custom hoodie',
    body: '<p style="font-size:16px; color:#444;">It\'s not a trend—it\'s a movement. People are tired of being walking billboards for big brands. They want something personal, something meaningful. Something that says "this is me."</p>',
    bullets: ['Join thousands rocking custom gear', 'Be ahead of the curve', 'Your name never goes out of style'],
    ps: 'Get in on the trend before it peaks.'
  },
  {
    B: 'Just Dropped: ',
    C: ' —Your Name, Fresh Style',
    headline: 'New Collection Alert: Name Your Look',
    intro: '<?= name ?>, we just unveiled a whole new lineup of customizable apparel. Hoodies, tees, sweatshirts—all available with YOUR name on them. Fresh fits dropping now.',
    imgAlt: 'New collection hoodie',
    body: '<p style="font-size:16px; color:#444;">New cuts, new fabrics, new possibilities. Whether you want a classic fit or something more modern, our new collection has you covered. Literally.</p>',
    bullets: ['Expanded product lineup', 'Modern and classic fits', 'Fresh designs you won\'t find elsewhere'],
    ps: 'Your new favorite piece is waiting.'
  },

  // ===== 25-27: Social Proof =====
  {
    B: 'Join Thousands Like ',
    C: ' —You\'re in Good Company',
    headline: 'You\'re Not Alone—Thousands Have Made Their Mark',
    intro: '<?= name ?>, we\'ve helped thousands of people wear their names with pride. From New York to LA, London to Tokyo—our gear is making waves worldwide.',
    imgAlt: 'Custom hoodie community',
    body: '<p style="font-size:16px; color:#444;">Seeing your name on premium apparel changes something. Customers tell us they feel more confident, more seen, more themselves. Don\'t take our word for it—join the community.</p>',
    bullets: ['Thousands of happy customers', '5-star reviews across the board', 'Global community of name-wearers'],
    ps: 'Join the movement. Wear your name.'
  },
  {
    B: 'What People Are Saying About ',
    C: ' —Real Reviews, Real Results',
    headline: '"Best Hoodie I\'ve Ever Owned" —Real Customer',
    intro: 'Don\'t just take our word for it, <?= name ?>. Here\'s what people are saying about wearing their name on premium custom gear.',
    imgAlt: 'Customer review hoodie',
    body: '<p style="font-size:16px; color:#444;">"I\'ve never had so many compliments on a piece of clothing." —Mike B. "The quality blew me away. And seeing my name on it? Next level." —Sarah K. "Bought one for myself, then three more for gifts. Addicting." —James T.</p>',
    bullets: ['Rated 4.9/5 by customers', '"Better than expected" — most common review', '95% would recommend to a friend'],
    ps: 'See what everyone\'s talking about.'
  },
  {
    B: 'Rated 5 Stars by People Like ',
    C: ' —See Why',
    headline: 'The Reviews Are In—And They\'re All About You',
    intro: '<?= name ?>, we pour our hearts into every piece we make. But don\'t take our word for it. Our customers have spoken, and they can\'t stop raving.',
    imgAlt: 'Customer favorite hoodie',
    body: '<p style="font-size:16px; color:#444;">"The embroidery is flawless. Colors are vibrant. I\'ve washed it a dozen times and it still looks brand new." —David R. "Perfect fit, incredible quality, and I love seeing my name every time I look in the mirror." —Emma L.</p>',
    bullets: ['Embroidery that lasts', 'Sizes that actually fit', 'Customers who keep coming back'],
    ps: 'Your turn to be a 5-star review.'
  },

  // ===== 28-30: Family / Friends =====
  {
    B: 'For the Whole Crew: ',
    C: ' —Matching Names, Maximum Style',
    headline: 'Nothing Brings People Together Like Matching Gear',
    intro: '<?= name ?>, imagine the family reunion. The vacation. The game day. Everyone in their own custom name gear. It\'s not just clothing—it\'s a memory.',
    imgAlt: 'Family name hoodies',
    body: '<p style="font-size:16px; color:#444;">From "Mom" and "Dad" hoodies to the kids\' names on mini tees—create a matching set that\'s uniquely YOUR family. Great for reunions, vacations, and everyday bonding.</p>',
    bullets: ['Custom names for every family member', 'Mix and match styles & colors', 'Discounts on bulk family orders'],
    ps: 'Make your family the best-dressed crew.'
  },
  {
    B: 'Squad Goals: ',
    C: ' —Matching Names, Better Friendships',
    headline: 'Best Friends Wear Each Other\'s Names',
    intro: '<?= name ?>, you and your crew already finish each other\'s sentences. Why not share style too? Get matching custom name gear that shows the world you\'re a unit.',
    imgAlt: 'Friends custom hoodies',
    body: '<p style="font-size:16px; color:#444;">Birthday gifts, friendship anniversaries, or just because—nothing says "you\'re my person" like custom name gear. Each person gets their own name, but the vibe is all about the squad.</p>',
    bullets: ['Perfect for friend groups', 'Each person gets their name', 'Instagram-worthy group shots guaranteed'],
    ps: 'Your squad never looked this good.'
  },
  {
    B: 'Couples That Name Together: ',
    C: ' —His & Hers, Perfect Together',
    headline: 'The Couple That Wears Names Together, Stays Together',
    intro: '<?= name ?>, looking for the ultimate couple\'s gift? Nothing says "we\'re together" like matching custom name apparel. His name. Her name. Perfectly paired.',
    imgAlt: 'Couples name hoodies',
    body: '<p style="font-size:16px; color:#444;">Whether it\'s for Valentine\'s, an anniversary, or just because—surprise your significant other with matching custom gear. Coordinated, comfortable, and undeniably cute.</p>',
    bullets: ['His & Hers matching sets', 'Any name, any style, any color', 'The ultimate couple\'s gift'],
    ps: 'The couple that slays together, stays together.'
  },

  // ===== 31-33: Seasonal / Everyday Wear =====
  {
    B: 'Your Go-To Layer: ',
    C: ' —Perfect for Every Season',
    headline: 'The Layer You\'ll Reach For Every Single Day',
    intro: '<?= name ?>, some pieces in your wardrobe just become part of your rotation. This is that piece. The hoodie that goes with everything. With YOUR name on it.',
    imgAlt: 'Everyday hoodie',
    body: '<p style="font-size:16px; color:#444;">Perfect for chilly mornings, cool evenings, and everything in between. Throw it on with jeans, joggers, or shorts. Dress it up or keep it casual. Your name, your rules, every day.</p>',
    bullets: ['Versatile for any outfit', ['Lightweight enough for spring, warm enough for fall'], 'The most-worn piece in your closet'],
    ps: 'Your new everyday essential.'
  },
  {
    B: '365 Days of Style: ',
    C: ' —Wear It All Year Round',
    headline: 'From January to December—This Hoodie Works',
    intro: '<?= name ?>, some clothes are seasonal. Not this. Our custom name hoodie is a 365-day staple that works as hard as you do, all year round.',
    imgAlt: 'All-season hoodie',
    body: '<p style="font-size:16px; color:#444;">Layer it in winter. Rock it solo in spring. Bring it for summer nights. This isn\'t just a hoodie—it\'s your year-round signature piece. And yes, it has your name on it.</p>',
    bullets: ['Year-round versatility', ['Premium fabric that breathes in warmth and stays cozy in cold'], 'Your name, always in style'],
    ps: 'Every season is hoodie season with your name on it.'
  },
  {
    B: 'Weekend Vibes: ',
    C: ' —Casual Comfort, Personal Style',
    headline: 'Weekends Were Made for This',
    intro: '<?= name ?>, we know the feeling. Friday hits, you just want to be comfortable. But you still want to look good. Enter: the custom name hoodie. Effortless. Iconic. Yours.',
    imgAlt: 'Weekend hoodie comfort',
    body: '<p style="font-size:16px; color:#444;">Coffee runs. Grocery trips. Lounging at home. Hanging with friends. Whatever your weekend looks like, doing it in custom name gear makes it better. Because you look good, feel good, and it\'s YOUR name.</p>',
    bullets: ['Ultimate weekend comfort', 'Looks great without trying', 'Your name makes every outfit hit different'],
    ps: 'Weekend mode: ON. Name: ON.'
  },

  // ===== 34-35: Storytelling / Personal =====
  {
    B: 'The Story Behind ',
    C: ' —Wear Your Legacy',
    headline: 'Every Name Has a Story. Wear Yours.',
    intro: '<?= name ?>, think about your name for a second. Maybe it was your grandmother\'s. Maybe your parents chose it because of what it means. Maybe you\'ve made it mean something through your journey.',
    imgAlt: 'Storytelling name hoodie',
    body: '<p style="font-size:16px; color:#444;">Your name carries history. It carries dreams, struggles, victories. When you wear it on premium apparel, you\'re not just making a fashion statement—you\'re honoring everything that name represents.</p>',
    bullets: ['A name is a story worth telling', 'Wear it as a reminder of where you come from', 'Inspire others by owning who you are'],
    ps: 'Your story deserves to be seen.'
  },
  {
    B: 'This One\'s for You, ',
    C: ' —Because You Matter',
    headline: 'You\'ve Come This Far. Let the World Know.',
    intro: '<?= name ?>, we don\'t know your full story. But we know this: you\'ve made it to today. You\'ve overcome, you\'ve grown, you\'ve become. And that deserves recognition.',
    imgAlt: 'Personal name hoodie',
    body: '<p style="font-size:16px; color:#444;">Whether it\'s a reminder of how far you\'ve come or a declaration of where you\'re going—wearing your own name is a powerful act. It says "I exist, I matter, and I\'m not hiding."</p>',
    bullets: ['A reminder of your journey', 'A declaration of your presence', 'Celebrate yourself—you\'ve earned it'],
    ps: 'You matter. Wear it proudly.'
  },
];

// Fix bullet issue in some templates (the [[...]] wrapping)
TEMPLATES[31].bullets = ['Perfect for any outfit', 'Lightweight enough for spring, warm enough for fall', 'The most-worn piece in your closet'];
TEMPLATES[32].bullets = ['Year-round versatility', 'Premium fabric that breathes in warmth and stays cozy in cold', 'Your name, always in style'];

async function main() {
  console.log(`Generating ${TEMPLATES.length} email templates...`);

  const rows = TEMPLATES.map(t => {
    const html = wrapHTML({
      headline: t.headline,
      intro: t.intro,
      imgSrc: IMG,
      imgAlt: t.imgAlt,
      body: t.body,
      bullets: t.bullets,
      ps: t.ps,
    });
    return [html, t.B, t.C];
  });

  // Validate count
  if (rows.length !== 35) {
    console.error(`Expected 35 rows, got ${rows.length}`);
    process.exit(1);
  }

  const token = await getToken(true); // write access
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?valueInputOption=USER_ENTERED`;

  const body = JSON.stringify({
    values: rows,
    majorDimension: 'ROWS',
  });

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error('API error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`✅ Successfully wrote ${data.updatedCells} cells (${data.updatedRows} rows) to ${RANGE}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
