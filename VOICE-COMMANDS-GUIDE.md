# Voice Commands Guide - RoamWise

## How to Use Voice Commands

1. Click and hold the 🎤 Voice button on the AI page
2. Speak clearly into your microphone
3. Release the button when done
4. Wait for processing

**Note:** Voice recognition requires:
- Chrome, Edge, or Safari browser
- Microphone permissions granted
- Internet connection (for speech processing)

---

## Supported Voice Commands

### Search Commands
- **"Search for [query]"** - Searches for anything
  - Example: "Search for coffee shops"
  - Example: "Search for hotels near beach"

- **"Find [query]"** - Same as search
  - Example: "Find Italian restaurants"
  - Example: "Find museums"

- **"Look for [query]"** - Same as search
  - Example: "Look for parks"

### Food Commands
- **"Food"** - Searches for restaurants
- **"Restaurant"** - Searches for restaurants
- **"Eat"** / **"Where to eat"** - Searches for restaurants

### Navigation Commands
- **"Go to search"** - Opens search page
- **"Go to AI"** / **"Open assistant"** - Opens AI page
- **"Go to trip"** - Opens trip planning page
- **"Go to map"** - Opens map page
- **"Go to profile"** - Opens profile page

### Trip Planning Commands
- **"Plan trip"** - Opens trip planning page
- **"Plan vacation"** - Opens trip planning page
- **"Generate trip"** - Opens trip planning and clicks generate

### Map Commands
- **"Map"** - Opens map page
- **"Navigation"** - Opens map page
- **"Location"** - Opens map page
- **"Weather"** - Opens map page

### Settings Commands
- **"Profile"** - Opens profile/settings page
- **"Settings"** - Opens profile/settings page

### Default Behavior
If no command is recognized, the voice input is treated as a search query and automatically searches for what you said.

---

## Examples of Complete Voice Flows

### Example 1: Search for Restaurants
1. Say: **"Find Italian restaurants"**
2. App navigates to search page
3. Types "Italian restaurants" in search
4. Executes search automatically
5. Shows results

### Example 2: Plan a Trip
1. Say: **"Plan trip"**
2. App navigates to trip planning page
3. You can then select interests manually
4. Click generate or say **"Generate trip"**

### Example 3: Quick Navigation
1. Say: **"Go to map"**
2. App switches to map view
3. You can then interact with the map

### Example 4: Find Food
1. Say: **"Food"**
2. App searches for restaurants
3. Shows restaurant results

---

## Voice Command Processing Flow

```
User speaks → Web Speech API transcribes →
Command parser analyzes → Action executed →
Confirmation shown
```

**Processing includes:**
1. Speech-to-text transcription
2. Text normalization (lowercase, trim)
3. Keyword matching
4. Action execution
5. Visual feedback

---

## Error Messages and Solutions

### ❌ "No speech detected"
**Solution:** Speak more clearly or check microphone

### ❌ "Microphone not found"
**Solution:** Connect a microphone or check device settings

### ❌ "Microphone permission denied"
**Solution:** Enable microphone in browser settings
- Chrome: Settings → Privacy → Microphone
- Safari: Preferences → Websites → Microphone

### ❌ "Network error"
**Solution:** Check internet connection

### ❌ "Not Supported"
**Solution:** Use Chrome, Edge, or Safari browser

---

## Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome | ✅ Yes | Best support |
| Edge | ✅ Yes | Full support |
| Safari | ✅ Yes | macOS/iOS only |
| Firefox | ❌ No | Not supported |
| Opera | ✅ Yes | Chromium-based |

---

## Tips for Best Results

1. **Speak clearly** - Enunciate words
2. **Reduce background noise** - Find quiet environment
3. **Use short phrases** - Simpler commands work better
4. **Wait for button feedback** - See "Listening..." before speaking
5. **Check microphone** - Test with other apps first
6. **Grant permissions** - Allow microphone access when prompted

---

## Privacy & Security

- Voice recognition is processed by browser's speech API
- Audio sent to Google/Apple servers for transcription
- No audio is stored by RoamWise app
- Transcripts are processed locally in browser
- No voice data is logged or saved

---

## Advanced Usage

### Combining Commands
While you can't combine multiple commands in one phrase, you can:
1. Use voice to navigate
2. Use voice again to search
3. Use voice to generate trip

### Custom Queries
Any phrase not matching a specific command is treated as a search query:
- "Best pizza in town" → Searches for "best pizza in town"
- "Things to do today" → Searches for "things to do today"

---

## Troubleshooting

### Voice button disabled?
- Check browser compatibility
- Try Chrome or Edge

### No transcription appearing?
- Check microphone permissions
- Test microphone in other apps
- Check internet connection

### Wrong transcription?
- Speak more clearly
- Reduce background noise
- Try shorter phrases
- Use specific command words

### Commands not working?
- Check console for errors (F12)
- Reload page and try again
- Clear browser cache

---

## Feedback

Voice recognition uses Web Speech API which continuously improves. If you experience issues:
1. Check browser console for errors
2. Try different command phrasing
3. Ensure microphone is working
4. Test in supported browser

For best experience, use the latest version of Chrome or Edge with a good quality microphone in a quiet environment.