[Türkçe](README.tr.md) | English

# Kasa

A local, encrypted password vault for Windows with a bilingual Turkish and English interface. Stores passwords, API keys, `.env` variables, and small files inside a single `.age` file. Kasa never connects to the internet while running; during installation, npm packages and signatures are verified online.

## Security model

Kasa uses standard age passphrase encryption via `age-encryption`. Decrypted vault content stays in memory. An explicitly requested plaintext export is first written to a temporary file beside its destination, then published; failed exports clean up that temporary file. The master password is entered without echoing characters and cannot be recovered if forgotten. Use a strong passphrase of at least 12 characters—ideally 4–5 randomly chosen words—and store it safely.

Changes are saved immediately. Atomic writes, a `.bak` copy of the previous save, session locking, and external-modification detection are built in. These do not replace regular backups stored on separate media.

## Installation

Requires Windows 10/11, PowerShell or Windows Terminal, and **Node.js 24 or later**.

For step-by-step downloads, SHA-256 verification, and setup, see [Getting started](#getting-started) below.

The installer prepares `%LOCALAPPDATA%\Programs\kasa.yeni`, installs locked dependencies with `npm ci --ignore-scripts --omit=dev`, and runs `npm audit signatures`. It uses `npm.cmd` beside the selected `node.exe`; if missing, it stops before copying files. Only after both checks pass does it rename the old installation to `kasa.eski` and activate the new one as `kasa`. Preparation failures leave the active installation intact; activation failure restores the old folder. Owned old files are then removed using `kurulum-listesi.json`. Administrator rights are not required. Only the program folder is added to the user `PATH`; its raw registry value and type are preserved. No Desktop/Start Menu shortcuts, Uninstall entries, or `.ps1` files are created.

## Getting started

This guide uses the English interface. For each choice, type the number and press **Enter**. Code blocks show short screen excerpts; hidden passwords are not displayed.

### 1. Install Kasa

1. Open [nodejs.org](https://nodejs.org). Select **LTS**. On the download page, choose **24 LTS**, **Windows**, and **Windows Installer (.msi)**. If another LTS version is shown, select 24 from the version list. Open the downloaded file. Keep the defaults, click **Next**, accept the license, and finish installation.
2. Open [Kasa's GitHub repository](https://github.com/ozankartalerdogan-code/kasa) and go to [Releases](https://github.com/ozankartalerdogan-code/kasa/releases). Under **Assets** for your chosen release, download `kasa-v1.0.0.zip` and `SHA256SUMS.txt` into the same folder. If you choose another version, change the ZIP name in the command below. Do not select the `Source code` downloads.
3. Open the download folder in File Explorer. Type `powershell` in the address bar and press Enter. In the window that opens, enter:

   ```powershell
   (Get-FileHash .\kasa-v1.0.0.zip -Algorithm SHA256).Hash
   ```

   A long string of letters and numbers appears. Open `SHA256SUMS.txt` in Notepad. Compare the string beside the ZIP name with the one on screen. Letter case does not matter; **every character must match**. If they differ, stop and download the files again.
4. Right-click the ZIP → **Extract All** → **Extract**. In the extracted folder, double-click `kur.cmd`. Windows may show **“Unknown publisher”** or **“Windows protected your PC”**. If you downloaded the official release and verified it as described above, use **More info → Run anyway**. Installation requires an internet connection. Wait for this message:

   ```text
   Open a new PowerShell window and type kasa.
   ```

### 2. Open your vault for the first time

1. Click Windows **Start**. Type `PowerShell` and open the app. In the new window, type `kasa` and press Enter. At the language screen, type `2` for English and press Enter. The default number in brackets may be 1 or 2, depending on your computer:

   ```text
   Dil / Language:
   1) Türkçe
   2) English
   Seçim / Choice [2]: 2
   ```

2. Choose a master password of at least 12 characters. You can use 4–5 randomly chosen words. Enter the same password twice. Keep it somewhere safe, such as on paper:

   ```text
   A new vault will be created. Use at least 12 characters.
   Write this password down and keep it safe; if forgotten, the vault cannot be opened.
   Create a passphrase using 4–5 randomly chosen words.
   New master password:
   Re-enter master password:
   ```

   > [!CAUTION]
   > **If you forget the master password, there is NO way to open the vault. There is no password reset or recovery. Backups also require this password.**

   > [!IMPORTANT]
   > **What to expect**
   >
   > - Nothing appears while you type a password, including asterisks or dots. Type it and press Enter.
   > - Ctrl+V works for pasting; a password pasted into a hidden field remains invisible.
   > - Usernames and addresses are visible. Hidden fields, such as passwords and private notes, are invisible while you type.
   > - A copied password is cleared from the clipboard after 30 seconds or when you exit the vault. The program warns you if it cannot clear the clipboard.
   > - After 5 minutes of inactivity, the vault locks itself. Run `kasa` again and unlock it with your master password.
   > - Opening the vault may take a few seconds. This security measure slows down password guessing attacks.

On later launches, enter the same master password:

```text
Master password:
```

### 3. Save, find, and use your first account

1. Choose **5** from the main menu. Enter `example-account` as the entry name and **2** for the account type. You can press Enter to leave the category and note blank. Enter your username, the account password, and the website address in order. The account password is separate from your master password. Leaving it blank generates a strong password; you must also set that generated password on the website yourself. Kasa does not change the website's password automatically.

   ```text
   Your choice: 5
   Entry name: example-account
   Type: 1) Key  2) Account  3) Env: 2
   Category (blank = General):
   Note (hidden, blank = none):
   Username / email: example-user
   Password (hidden, blank = generate strong password):
   Address (website): https://example.com
   Saved.
   ```

   If a strong password was generated, you will be asked `Copy password to clipboard? (yes)`. Type `yes` to copy it or press Enter to skip. Changes are saved immediately.
2. To find the entry, choose **2**. Type part of the entry name:

   ```text
   Your choice: 2
   Search text: example-account
   1) example-account | account | General
   ```

3. To use the password, choose **4**. Enter the number beside the account in the list, then choose **1** for the password. Paste it into the application's password field with Ctrl+V:

   ```text
   Your choice: 4
   1) example-account | account | General
   Number from list: 1
   Selected entry: 'example-account'
   1) Password  2) Username: 1
   Copied to clipboard. It will be cleared in 30 seconds or when you exit.
   ```

4. To view it on screen, choose **3**, then **1** for an entry, then the account's number in the list. The password is hidden at first. Enter **1** at the hidden-field prompt to reveal it. When finished, press Enter to clear the screen:

   ```text
   1) Password: HIDDEN
   2) Note: HIDDEN
   Enter the number of a hidden field to reveal it (blank = none): 1
   ```

### 4. Store and export a small file

1. Choose **6**. At the file path prompt, drag the file from File Explorer into the PowerShell window, then press Enter. You can press Enter to leave the category and note blank:

   ```text
   File path to add (you can drag and drop the file):
   Category (blank: General):
   Note (hidden):
   Saved.
   ```

   Kasa stores an encrypted copy and keeps the original file outside the vault. A file can be up to 25 MiB. See [Usage](#usage) for details.
2. To export it, choose **7**. Enter the file's number in the list. Drag your Desktop folder into the window and press Enter; for example, `C:\Users\Example\Desktop`. The file is saved in that folder under its own name, and the full destination path is shown on screen. You can also enter a full file path such as `C:\Documents\example-file.txt` (the folder must already exist). If a file with the same name exists, type `yes` to confirm overwriting it. The exported file is unencrypted; anyone who can open it can read its contents. Two short screen excerpts:

   ```text
   Destination folder or file path (you can drag the folder into this window; if you choose a folder, the file is saved with its own name): "C:\Users\Example\Desktop"
   C:\Users\Example\Desktop\example-file.txt — This file will be written UNENCRYPTED
   ```

   ```text
   File exported with SHA-256 verification.
   ```

### 5. Create and verify a backup

1. Choose **12**. Enter the path to an existing folder on a USB drive. If you leave it blank by pressing Enter, the backup is written beside the vault; move that copy to USB or trusted cloud storage afterward. A single copy on the same computer is not enough if the computer fails.

   ```text
   Your choice: 12
   Destination folder (blank = vault folder):
   ```

   The program displays `Backup created and verified:` followed by the full path to the dated backup file. Keep this file. You must upload it to cloud storage yourself. **A backup requires the master password that was in use when it was created.**
2. Choose **13**. Drag your saved backup file into the window and press Enter:

   ```text
   Your choice: 13
   File path to verify (blank = current vault) (you can drag and drop):
   ```

   Look for a line starting with `Backup verified:` followed by your chosen file's path. Leaving the input blank checks the open vault rather than a backup. For backups after a master password change, see [Backup routine](#backup-routine).

### 6. Frequently asked questions

**I forgot my master password.** It cannot be recovered. The vault and its backups cannot be opened without the corresponding master password. Reinstalling does not reset the password.

**My computer failed. How do I move to a new one?** Install Kasa on the new computer. Before running `kasa`, type `%LOCALAPPDATA%` in File Explorer's address bar. Create a `kasa` folder there if it does not exist. Put a copy of your encrypted backup in that folder and rename it **kasa.age**. In Explorer, enable **View → Show → File name extensions** (on Windows 10, **View → File name extensions**); check that the name is not `kasa.age.age` or `kasa.age.bak`. If `kasa.age` already exists, move it somewhere safe while Kasa is closed before placing the backup there. Then run `kasa` in a new PowerShell window. Unlock it with the master password used when the backup was created:

```text
Master password:
```

For a custom location or a conflict with an old vault, see [Vault location and migrating an old vault](#vault-location-and-migrating-an-old-vault).

**The program will not start.** If Node.js is too old, a warning like this appears; the version number depends on your computer. Install Node.js 24 LTS:

```text
This program requires Node.js 24 or later. Current version: v22.0.0. Install Node.js 24 LTS from https://nodejs.org.
```

If the `kasa` command is not found, close PowerShell and open a **new window**. If the problem continues, check the output from `kur.cmd`. A new window is required after installation.

**Can I open my vault without Kasa?** Yes, if you know the master password, you can use [official age.exe](https://github.com/FiloSottile/age/releases). This exports all secrets into an unencrypted JSON file. For the command and details, see [Escape hatch](#escape-hatch-recovering-with-official-ageexe).

## Vault location and migrating an old vault

The default vault file is `%LOCALAPPDATA%\kasa\kasa.age`. The program folder and data folder are separate. If `LOCALAPPDATA` is unset, `%USERPROFILE%\AppData\Local\kasa\kasa.age` is used. To use a custom location in the current PowerShell window:

```powershell
$env:KASA_DOSYA = 'D:\Documents\kasa.age'
kasa
```

Never pass your master password or secrets on the command line. The program does not accept arguments.

When `KASA_DOSYA` is not set, Kasa checks the legacy path `%USERPROFILE%\Kasa\kasa.age`. If a vault exists only at the legacy location, no empty vault is created; instead, you are offered **Move safely** or **Open from the old location for now**. Migration retries only wrong passwords, up to three times. It writes an exclusive encrypted copy, checks SHA-256, and re-opens the new copy with your password. Deleting the old vault and its `.bak` file requires a separate `yes` confirmation showing the backup path. After confirmation, the new copy is opened and its original SHA-256 checked again; failure preserves the old files. Pressing Enter keeps the old copies. The old lock is released immediately after migration. A running lock owner prevents takeover; only stale locks may be removed after confirmation.

If a vault exists at both locations, Kasa prints their paths, sizes, and last-modified timestamps and stops. Pick the vault you want with `KASA_DOSYA` or move the other copy elsewhere. If you kept the old copy at the end of migration, you will need to resolve this before the next launch as well.

## Usage

On first launch, before prompting for a master password, Kasa asks you to choose the interface language (**Türkçe** or **English**). If your system locale starts with `tr`, the default is `1` (Türkçe); otherwise it is `2` (English)—pressing Enter accepts the default. Your choice is saved atomically in `%LOCALAPPDATA%\kasa\ayarlar.json`, independently of `KASA_DOSYA` (fallback: `%USERPROFILE%\AppData\Local\kasa\ayarlar.json`). An existing invalid or unrelated file, or a settings path matching the vault, is preserved with a warning; your language still applies to the session. You can also set `KASA_DIL=tr` or `KASA_DIL=en` to override the language without prompting. To switch languages later, choose **14) Dil / Language** from the main menu.

On first vault creation, you enter a new master password twice. Hidden input shows no characters or asterisks; press Enter to finish. Startup displays the version line, e.g. `Kasa v1.0.0`.

```text
1) List entries
2) Search
3) Show entry
4) Copy to clipboard (clears in 30s)
5) Add / update entry
6) Add file
7) Export file
8) Export as .env file
9) Delete entry / file
10) Generate password (copies to clipboard)
11) Change master password
12) Create backup
13) Verify backup
14) Dil / Language
0) Exit
```

Select actions by number. When listing, leaving the category blank shows everything. Search checks entry names, categories, and notes, not secret values. Name, category, username, and address are visible fields—do not store secrets there. Inside an entry card, hidden fields are revealed only when you pick their number; pressing Enter clears the screen.

When adding an entry, choose key, account, or env. Using an existing name updates that entry after confirmation. When updating, blank inputs keep current values. For a new account, a blank password generates a strong random password; when updating, generating a new password requires extra confirmation. Loading from a `.env` file replaces all existing variables, whereas manual entry preserves existing ones. The `.env` format supports single-line `NAME=value` entries only; multiline values, variable expansion, and full dotenv escaping are not supported. Exports reject values combining a single quote with a double quote, backslash, or dollar sign. Import is limited to 1 MiB; encrypted vault and backup reads to 200 MiB. Verify exported `.env` files in your target application.

Files are embedded with their SHA-256 digest and byte size. A single file may be up to **25 MiB**, and total embedded files up to **100 MiB**. You can drag and drop file paths into the terminal. Exporting a file or `.env` **creates an unencrypted file**; overwriting an existing target requires extra confirmation. Targets pointing to the active vault, `.bak`, `.kilit`, `.tmp.*`, or `.age` files are rejected. Keep exported plaintext files in a safe place and never add them to Git or cloud sync folders.

Secrets copied to the clipboard are cleared after about 30 seconds or upon exit. If you copy something else in the meantime, your new clipboard content is left intact. Windows clipboard flags are set to block clipboard history and cloud sync. After 5 minutes of inactivity, the session locks and clears the screen. Always exit with **0**; closing the window with X may prevent clipboard cleanup.

## Backup routine

Once a week and after important changes:

1. Use menu **12** to create a dated encrypted backup, ideally on another drive or USB folder. FAT32/exFAT backups do not require hard links: Kasa creates an exclusive file, writes and syncs it, then verifies it. Failed verification removes the new copy. Leaving the destination blank uses the vault folder. Existing backups are never overwritten.
2. Save the printed SHA-256 digest of the encrypted backup file. Copy the backup to separate media; you may also upload the encrypted file to trusted cloud storage.
3. Restore the copy to a separate folder, verify it with menu **13**, and confirm that the SHA-256 digests match.

`.bak` holds only the previous save; deleted secrets may still exist in it. Changing your master password does not re-encrypt old `.bak` or dated backups. Create and verify a new backup with the new password before deciding whether to keep or delete old copies. Old backups require the old password. Kasa never uploads backups to the cloud automatically.

## Escape hatch: recovering with official age.exe

Even if Kasa itself cannot run, you can decrypt the standard age file using the official Windows `age.exe` tool from [age releases](https://github.com/FiloSottile/age/releases). In a secure local folder, making sure `kasa-acik.json` does not already exist:

```powershell
.\age.exe -d -o kasa-acik.json "$env:LOCALAPPDATA\kasa\kasa.age"
```

Adjust the path if you use a custom vault or backup. The tool will prompt for your master password. **This command writes all secrets into an unencrypted JSON file.** Inside the JSON, entries and embedded files store fields such as `icerikBase64`, `boyutBayt`, and `sha256`. When reconstructing an embedded file manually, decode base64 and verify both size and SHA-256. Never upload the plaintext JSON to the cloud, and delete it when finished. Note that standard file deletion does not guarantee secure erasure from SSDs or backups.

## Updating

First create a backup with menu **12**. Close all Kasa windows. Download the new tagged release ZIP from [Kasa releases](https://github.com/ozankartalerdogan-code/kasa/releases), verify its SHA-256 hash, extract it to a separate folder, and run the new `kur.cmd`. Program files are updated while your vault data in `%LOCALAPPDATA%\kasa` is preserved. Open a new PowerShell window and verify the version shown at startup. If dependency or signature checks fail, the old installation stays active; fix the issue and re-run setup. Empty or incomplete folders do not block reinstalling: incomplete staging folders or unlisted files are retained with a timestamp suffix when necessary. User files in the previous program folder remain in `kasa.eski`; if needed on a later update, that folder is retained with a timestamp suffix and its location is printed. Older installations without a manifest are also retained there for safety.

If a vault has a newer schema version, Kasa tells you to update after unlocking with the right password. Wrong passwords and corrupted files produce the same generic error; schema version is never revealed before decryption succeeds.

## Uninstalling

Run `kaldir.cmd` from the ZIP folder, or in PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\kasa\kaldir.cmd"
```

Only files recorded in `kurulum-listesi.json`, the whole `node_modules` folder, and the program's user `PATH` entry are removed. Empty folders are then removed. Unlisted files (including custom vaults and backups in the program folder) are preserved, and their remaining folder is reported in both languages. Without a manifest, only a completely empty program folder is removed; otherwise all contents are kept and the notice is repeated in both languages. An invalid manifest stops file removal. The PATH entry is removed before file validation. Uninstallation stops if a symlink or junction is detected in the installation path. Node.js is also required to run the uninstaller. **Your vault data remains at `%LOCALAPPDATA%\kasa`. If you want to delete your vault, make sure you have a backup first, then delete that folder manually.** Custom vault paths and legacy copies are also left untouched.

## Known limitations

- Does not protect against malware, keyloggers, screenshots, or memory inspection while a session is unlocked. JavaScript strings cannot be guaranteed to be wiped from memory, and remnants may reach the pagefile.
- Clipboard flags do not stop third-party apps from reading the clipboard. Force-closing the terminal or another app locking the clipboard can prevent cleanup. Terminal scrollback/history may not be completely erased.
- Session locking coordinates Kasa instances only; it is not an OS-level lock preventing external writes. Windows ACLs and disk security should be managed separately.
- Power-loss resilience is not absolute. Exclusive backup/migration copies and temporary plaintext exports may remain after forced termination. No hard-link support is required.
- The entire vault is loaded into memory and re-encrypted on every save. It is not designed as a large-file archive or for concurrent cloud sync.

## License and security reporting

Licensed under the [MIT License](LICENSE). To report security issues, read the [security policy](SECURITY.md).

## Tests

In a development checkout, run `npm test`. Tests run sequentially without child-process isolation, using temporary vaults, settings and mock clipboard operations. Installation file operations are covered in temporary folders. The Windows PATH test uses only a random `HKCU\Software\KasaTest-*` key and removes it afterward; it is skipped if the environment blocks child processes. Real clipboard and full online installer checks still require manual verification.

The official `age.exe` compatibility test is optional: set `AGE_EXE` to the executable path and `AGE_BATCHPASS_KLASOR` to the folder containing the batchpass plugin to enable it. It is skipped unless both are set.

Built on [age](https://age-encryption.org) by Filippo Valsorda and the `age-encryption` TypeScript library.
