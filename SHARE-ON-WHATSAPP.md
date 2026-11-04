# Sharing the invitation on WhatsApp

## 1. The link preview (automatic)

When you paste the invitation link in WhatsApp, WhatsApp fetches the site's preview
tags and shows the couple photo card with the title "Jithin & Dona | Wedding Invitation".

The tags live at the top of `index.html` and point at:

    https://akshya-krishnan.github.io/jd-wedding-invitation/

If the site is hosted at a different address, replace that address in every
`og:url`, `og:image`, `og:image:secure_url` and `twitter:image` tag, then rebuild
(`npm run build`) and push.

Notes
- The preview only works once the site is live on the internet (not on localhost).
- WhatsApp caches previews. If you change the photo later, append `?v=2` to the link
  when you share it so WhatsApp fetches the new one.

## 2. The photo card to attach (optional, looks best)

`public/assets/images/share/share-whatsapp.jpg` is a 1080x1080 card with the photo,
the names, the date and "Tap the link to open our invitation". To send it:

1. Send the picture in WhatsApp (as a photo).
2. Paste the link as the caption or as the next message.

## 3. Suggested message

    💍 The Holy Matrimony of Jithin & Dona
    📅 Monday, 11 January 2027 · 4:00 PM
    ⛪ Sacred Heart Mount Monastery Church, S.H. Mount, Kottayam

    Tap to open our invitation 💛
    https://akshya-krishnan.github.io/jd-wedding-invitation/
