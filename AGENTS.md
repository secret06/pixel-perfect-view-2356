<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Guest (student) reads/writes go through server functions in src/lib/posts.functions.ts using the admin client; tables have no anon policies so the anonymous browser ID never leaks.
- Admin access is checked server-side via has_role on every admin server function; the first account may claim admin only while none exists.
