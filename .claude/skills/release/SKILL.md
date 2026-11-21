---
name: release
description: Cut a new Langdle release - bump package.json (and, with `mobile`, mobile/pubspec.yaml), build the signed Android APK and AAB, commit, tag, push dev and publish the GitHub release with user-facing notes. Use only when the user runs /release.
argument-hint: "[patch|minor|major|X.Y.Z] [mobile]"
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm test:unit) Bash(npx tsc --noEmit) Bash(flutter *) Bash(dart run tool/sync_shared.dart) Bash(keytool *) Bash(cp *) Bash(mkdir *)
---

# Release

Arguments, in any order: `$ARGUMENTS`

- A bump: `patch` (the default when none is given), `minor`, `major`, or an
  exact version such as `1.4.0`.
- `mobile`: also release the Android app.

Releases are cut on `dev`. The user merges `dev` into `main` through a PR
afterwards, so this skill never touches `main` and never opens that PR.

The order below matters: nothing is committed, tagged or pushed until every
check and build has passed. If a step fails, stop, show the output, and put
back the version edits (`git checkout -- package.json mobile/pubspec.yaml`)
so the tree is left as it was.

## 1. Preflight

Stop and tell the user if any of these fail:

- `git branch --show-current` is `dev` and `git status --porcelain` is empty.
- `git fetch origin` then `git rev-list --count HEAD..origin/dev` is `0`, so
  `dev` is not behind the remote.
- `gh auth status` succeeds. If `gh` is missing, the user needs to install it
  and run `gh auth login`.
- The new tag (computed in step 2) does not exist yet, locally
  (`git tag -l vX.Y.Z`) or on the remote (`git ls-remote --tags origin vX.Y.Z`).
- With `mobile`, both `mobile/android/key.properties` and
  `mobile/env.prod.json` exist. Without the key file, Gradle silently signs
  with the debug key, and a debug-signed APK cannot update the installed
  app.

## 2. Work out the version

- The current version is `version` in `package.json`, and the previous tag
  is `git describe --tags --abbrev=0`. If they disagree, ask the user before
  going on.
- Apply the bump: `patch` 1.2.2 → 1.2.3, `minor` → 1.3.0, `major` → 2.0.0.
  An exact version must be greater than the current one.
- With `mobile`, the pubspec `version: A.B.C+N` becomes
  `version: <new version>+<N+1>`. The build number always goes up by one,
  even when the name jumps (web-only releases never change the pubspec, so
  its name may be behind).

Tell the user in one line what is about to happen, e.g.
`v1.2.2 → v1.2.3 (mobile, build 6)`, then go on without waiting.

## 3. Checks

```bash
pnpm test:unit
npx tsc --noEmit
# with mobile, from mobile/
flutter analyze && flutter test
```

## 4. Bump the files

Edit `"version"` in `package.json` and, with `mobile`, the `version:` line in
`mobile/pubspec.yaml`. Nothing else in the repo holds the version.

## 5. Build (mobile only)

From `mobile/`:

```bash
dart run tool/sync_shared.dart     # ship the current messages/ and flags
flutter build apk --release --dart-define-from-file=env.prod.json
flutter build appbundle --release --dart-define-from-file=env.prod.json
```

If `sync_shared.dart` changes any files, they go into the release commit
(they are what ships), and the summary should say so.

Check the APK is signed with the release key, not the debug one:

```bash
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
```

If the owner is `CN=Android Debug`, stop.

The outputs are `mobile/build/app/outputs/flutter-apk/app-release.apk` and
`mobile/build/app/outputs/bundle/release/app-release.aab`. The AAB stays
local: it is for a Play Console upload, and the user does that by hand.

## 6. Commit, tag, push

This follows the format of every earlier release. Do not add a
`Co-Authored-By` trailer: this project never uses one.

```bash
git add package.json mobile/      # mobile/ only when releasing mobile
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin dev
git push origin vX.Y.Z
```

## 7. Release notes

Read what changed since the previous tag:

```bash
git log --no-merges --format='%h %s%n%b' <prev>..vX.Y.Z
```

Write the notes in English, for players rather than developers:

- Up to three sections, each left out if it would be empty: `## New`,
  `## Fixed`, `## Improved`. Each item is one plain sentence about what a
  player sees, e.g. "The atlas lists the playable languages first", not
  "feat(lang-atlas): sort by active".
- Leave out changes a player never notices (refactors, tests, docs,
  tooling, CI, `chore:`), unless they are the whole release. Then write a
  single line such as "Behind-the-scenes improvements."
- Combine commits that describe the same change.
- With `mobile`, start with one line saying the Android app is updated and
  `langdle.apk` below is the file to download.
- End with `**Full changelog**: https://github.com/TeoryMan143/langdle/compare/<prev>...vX.Y.Z`.

Write the notes to a file in the scratchpad directory.

## 8. Publish the GitHub release

The site links the APK through
`https://github.com/TeoryMan143/langdle/releases/latest/download/langdle.apk`,
so the release marked *latest* must always be one that has `langdle.apk`
attached. That is why web-only releases are published with
`--latest=false`.

With `mobile`, first copy the APK to `<scratchpad>/release/langdle.apk`, because
the asset is named after the file. Then:

```bash
# mobile
gh release create vX.Y.Z <scratchpad>/release/langdle.apk \
  --verify-tag --title "vX.Y.Z" --notes-file <notes> --latest

# web only
gh release create vX.Y.Z \
  --verify-tag --title "vX.Y.Z" --notes-file <notes> --latest=false
```

## 9. Report

Reply with:

- the version, and the tag/commit that was pushed,
- the release URL that `gh` printed,
- the notes that were published,
- with `mobile`, the full path of the AAB and its build number, to upload to
  the Play Console,
- a reminder that `dev` → `main` is now ready for its PR.
