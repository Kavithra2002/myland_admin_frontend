# MyLand Admin

Internal dashboard for MyLand. Open this folder in a new Cursor tab.

```bash
cd E:\AMBEON\myland\admin
npm install
npm run dev
```

The app runs at **http://localhost:5174**.

## Pages

- **Dashboard** — summary of listings, users, and review counts
- **Review Authorizer** — approve, reject, or delete reviews submitted on project pages
- **Manage Listings** — sample listings workspace
- **User Management** — sample staff accounts
- **Inquiries** — sample inquiry inbox

Reviews submitted on the public site (`client`) are stored in the shared PostgreSQL database (`localhost:5432/postgres`) and appear here for moderation. Approved reviews show on the project page.

Connection settings live in `E:\AMBEON\myland\.env`.
