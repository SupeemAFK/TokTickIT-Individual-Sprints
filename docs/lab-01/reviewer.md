# Lab 1 — Peer Review Record  (fill this in)

**Author:** <Peemmapat Sripongsai> — <67070503436> — GitHub: @<SupeemAFK>
**Peer reviewer:** <Suwiwat Sinsomboon> — <67070503444> — GitHub: @<username>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
|  #1  | feature/1-project-foundation | PASSED LGTM  |
|  #2 | feature/2-health-check | PASSED LGTM |
|  #3  | feature/3-category-seed | PASSED LGTM |
|  #4  | feature/4-category-list | PASSED LGTM |

### feature/1-project-foundation
![alt text](image.png)
![alt text](image-1.png)

**Reviewer comment I received:** 
Frontend ✅️
Backend ✅️
PostgreSQL & Prisma ✅️
Vitest & Supertest ✅️
Credential safe ✅️
README present ✅️

LGTM 🫶

**How I responded:**
Thank you

### feature/2-health-check
![alt text](image-2.png)
![alt text](image-3.png)

**Reviewer comment I received:** 
Appreciate for the beforehand testing.

GET /api/health responded in the correct format ✅️,
Supertest passed successfully ✅️,
React page displays the backend status based on a real API call ✅️,
Backend told it's unable to reach when it's unavailable ✅️.

Approved 😁.

**How I responded:**
Thank you

### feature/3-category-seed
![alt text](image-4.png)
![alt text](image-5.png)
**Reviewer comment I received:** 

Prisma schema ✅️
Category table ✅️
Seed generator ✅️
Credential safe ✅️

LGTM ヽ༼ຈل͜ຈ༽ﾉ

**How I responded:**
Thank you

### feature/4-category-list
![alt text](image-6.png)
![alt text](image-7.png)

**Reviewer comment I received:** 
GET /api/categories retrieves categories successfully ✅️
The API returns each category ID and name in a predictable order ✅️
A Supertest test verifies the response ✅️
React displays custom added categories ✅️
Image
Loading and error states are shown ✅️
Image
A Vitest test verifies the category-list UI behavior ✅️
Good job, well done! (≧∇≦)/

**How I responded:**
Thank you

## Pull Requests I reviewed for my partner

### Issue 1: Set up the TokTickIT project foundation
![alt text](image-8.png)
![alt text](image-9.png)
![alt text](image-10.png)
**My comment:** Frontend production build passed. ✅
Backend TypeScript build passed. ✅
Vite responded with HTTP 200. ✅
Express started successfully. ✅
Frontend worked-example test passed. ✅
PostgreSQL reported healthy on port 5433. ✅
Prisma executed a database query successfully.✅
Secrets, dependencies, and build outputs are ignored. ✅

Clone and test it out project scaffold with example implementation along with library and tools installed correctly.
Good works LGTM 💖

**Partner's response:** 
Thank you @SupeemAFK for reviewing and verifying the project foundation. I have recorded the review evidence in docs/lab-01/reviewer.md. I will wait for the formal approval before merging this pull request.


### Issue 2: Implement the API health check
![alt text](image-11.png)
![alt text](image-12.png)

**My comment:** Look good.
The health api implemented correctly both client and server.
All the test are passed successfully.

LGTM krub 💪

**Partner's response:** 
Thank you @SupeemAFK for reviewing the health API implementation and verifying the test results. I have recorded your review and approval in docs/lab-01/reviewer.md.

### Issue 3: Create and seed IT request categories
![alt text](image-13.png)
![alt text](image-14.png)

**My comment:** 
What command did you use for seed?

**Partner's response:** 
I ran npm run prisma:seed from the server directory. This script executes tsx prisma/seed.ts. I ran the same command twice to verify idempotency, then confirmed that the database still contained 4 rows with 4 distinct category names.

**My comment 2:** 
Good schema is good and seed is simple and valid LGTM

### Issue 4: Display the IT request category list
![alt text](image-15.png)
![alt text](image-16.png)

**My comment:** 
Excellent work I see your code and also image of the working application. Code looks good and test is passed. LGTM


**Partner's response:** 
Thank you