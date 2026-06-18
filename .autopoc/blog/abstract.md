# Blog Abstract: lightnovel-studio

- **Thesis:** Deploying a modern AI-powered React SPA on OpenShift proves that containerized frontend apps with client-side LLM integration work seamlessly on the platform, while revealing the specific nginx configuration challenges that the UBI S2I image ecosystem presents.
- **Target Audience:** Frontend developers and platform engineers deploying SPAs on OpenShift
- **Blog Type:** Red Hat Developer Blog
- **Key Points:**
  1. Multi-stage UBI Dockerfile pattern for Vite/React apps (nodejs-22 build + ubi-minimal nginx serve)
  2. Practical nginx configuration for non-root containers with SPA routing
  3. Lessons learned from the UBI nginx-124 S2I image vs. manual nginx installation
- **Products:** Red Hat OpenShift AI, UBI 9, OpenShift BuildConfig
- **CTA:** Try deploying your own frontend SPA using the UBI nginx pattern demonstrated here
- **Proposed Sections:**
  1. What is Light Novel Studio?
  2. The containerization challenge
  3. Building the UBI Dockerfile
  4. Deploying to OpenShift
  5. Running PoC tests
  6. Lessons learned
  7. Try it yourself
