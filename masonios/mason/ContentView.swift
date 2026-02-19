import Foundation
import Combine
import AVKit
import PhotosUI
import SwiftUI

struct ContentView: View {
    @StateObject private var store = MasonDataStore()
    @State private var selectedTab: AppTab = .home
    @State private var isAccountPresented = false
    @AppStorage("ms_auth_access_token") private var authAccessToken: String = ""
    @AppStorage("ms_auth_user_id") private var authUserID: String = ""
    @AppStorage("ms_auth_email") private var authEmail: String = ""
    @AppStorage("ms_browse_as_guest") private var browseAsGuest: Bool = false
    @State private var showAuthScreen = false
    @State private var showStartupAnimation = true
    @State private var startupLogoScale: CGFloat = 0.72
    @State private var startupLogoRotation: Double = -8
    @State private var startupLogoOpacity: Double = 0
    @State private var startupTextOffset: CGFloat = 24
    @State private var startupTextOpacity: Double = 0
    @State private var startupBackdropOpacity: Double = 1

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                HomeView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                    .tag(AppTab.home)

                PricingView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Pricing", systemImage: "tag.fill")
                    }
                    .tag(AppTab.pricing)

                WhyMasonView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Why", systemImage: "sparkles")
                    }
                    .tag(AppTab.why)

                FlicksView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Flicks", systemImage: "play.rectangle.fill")
                    }
                    .tag(AppTab.flicks)

                ReviewsView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Reviews", systemImage: "star.bubble.fill")
                    }
                    .tag(AppTab.reviews)

                ContactView(showAccount: $isAccountPresented)
                    .tabItem {
                        Label("Contact", systemImage: "message.fill")
                    }
                    .tag(AppTab.contact)
            }

            if showStartupAnimation {
                ZStack {
                    LinearGradient(
                        colors: [MasonTheme.backgroundTop, MasonTheme.backgroundBottom],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .ignoresSafeArea()
                    .opacity(startupBackdropOpacity)

                    VStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(MasonTheme.primary.opacity(0.18))
                                .frame(width: 120, height: 120)
                            Image(systemName: "sparkles")
                                .font(.system(size: 46, weight: .bold))
                                .foregroundStyle(MasonTheme.primary)
                        }
                        .scaleEffect(startupLogoScale)
                        .rotationEffect(.degrees(startupLogoRotation))
                        .opacity(startupLogoOpacity)

                        Text("Mason")
                            .font(.system(size: 34, weight: .heavy, design: .rounded))
                            .foregroundStyle(MasonTheme.textPrimary)
                            .opacity(startupTextOpacity)
                            .offset(y: startupTextOffset)
                    }
                }
                .transition(.opacity)
                .zIndex(1)
                .allowsHitTesting(false)
            }
        }
        .environmentObject(store)
        .tint(MasonTheme.primary)
        .sheet(isPresented: $isAccountPresented) {
            AccountView(
                selectedTab: $selectedTab,
                isPresented: $isAccountPresented,
                authAccessToken: $authAccessToken,
                authUserID: $authUserID,
                authEmail: $authEmail,
                showAuthScreen: $showAuthScreen
            )
        }
        .fullScreenCover(isPresented: $showAuthScreen) {
            AuthView(
                authAccessToken: $authAccessToken,
                authUserID: $authUserID,
                authEmail: $authEmail,
                browseAsGuest: $browseAsGuest,
                isPresented: $showAuthScreen
            )
        }
        .task {
            runStartupAnimation()
        }
        .task {
            await store.loadIfNeeded()
        }
        .task {
            if authAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !browseAsGuest {
                showAuthScreen = true
            }
        }
        .onChange(of: authAccessToken) { _, newValue in
            if newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !browseAsGuest {
                showAuthScreen = true
            }
        }
    }

    private func runStartupAnimation() {
        guard showStartupAnimation else { return }
        withAnimation(.spring(response: 0.65, dampingFraction: 0.76)) {
            startupLogoScale = 1
            startupLogoRotation = 0
            startupLogoOpacity = 1
        }
        withAnimation(.easeOut(duration: 0.45).delay(0.2)) {
            startupTextOpacity = 1
            startupTextOffset = 0
        }
        withAnimation(.easeInOut(duration: 0.35).delay(1.15)) {
            startupBackdropOpacity = 0
            startupLogoOpacity = 0
            startupTextOpacity = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
            showStartupAnimation = false
        }
    }
}

private enum AppTab: Hashable {
    case home
    case pricing
    case why
    case flicks
    case reviews
    case contact
}

private enum MasonTheme {
    static let primary = Color(red: 0.03, green: 0.67, blue: 0.64)
    static let backgroundTop = Color(red: 0.95, green: 0.99, blue: 0.99)
    static let backgroundBottom = Color(red: 0.90, green: 0.95, blue: 0.99)
    static let card = Color.white
    static let textPrimary = Color(red: 0.07, green: 0.12, blue: 0.20)
    static let textSecondary = Color(red: 0.39, green: 0.45, blue: 0.55)
}

private struct ScreenContainer<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [MasonTheme.backgroundTop, MasonTheme.backgroundBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    content
                }
                .padding(16)
                .padding(.bottom, 24)
            }
        }
    }
}

private struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MasonTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

private struct HomeView: View {
    @Binding var showAccount: Bool
    @EnvironmentObject private var store: MasonDataStore

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    HStack {
                        Text("Data Status")
                            .font(.title3.bold())
                            .foregroundStyle(MasonTheme.textPrimary)
                        Spacer()
                        if store.isLoading {
                            ProgressView()
                                .scaleEffect(0.9)
                        }
                    }

                    if let loadError = store.lastLoadError {
                        Text(loadError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    } else {
                        Text("Connected. \(store.reviews.count) reviews, \(store.pricingPlans.count) plans loaded.")
                            .font(.footnote)
                            .foregroundStyle(MasonTheme.textSecondary)
                    }

                    Button {
                        Task { await store.refresh() }
                    } label: {
                        Label("Refresh Supabase Data", systemImage: "arrow.clockwise")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(MasonTheme.primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }

                Card {
                    Text("Hello, I'm Mason.")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(MasonTheme.textPrimary)

                    Text("Book a private session and I will FUCK you.")
                        .foregroundStyle(MasonTheme.textSecondary)

                    HStack(spacing: 10) {
                        Label("Book Session", systemImage: "calendar.badge.plus")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(MasonTheme.primary)
                            .clipShape(Capsule())

                        Label("See Reviews", systemImage: "star.fill")
                            .font(.headline)
                            .foregroundStyle(MasonTheme.textPrimary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color.black.opacity(0.06))
                            .clipShape(Capsule())
                    }
                }

                Card {
                    Text("Session Stats")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    StatLine(title: "Slow replies", detail: "Most clients hear back within a month.")
                    StatLine(title: "Foggy inconsistent scheduling", detail: "Everything is confirmed at some point.")
                    StatLine(title: "Private chat", detail: "Secure, real-time updates on your session.")
                }

                Card {
                    Text("From Mason")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)
                    Text("You WILL get FUCKED")
                        .font(.title2.weight(.semibold))
                        .italic()
                        .foregroundStyle(MasonTheme.primary)
                }

                Card {
                    Text("Recent Reviews")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    let recentReviews = store.reviews.isEmpty
                        ? Array(ReviewItem.samples.prefix(3))
                        : Array(store.reviews.prefix(3))
                    ForEach(Array(recentReviews.enumerated()), id: \.element.id) { index, review in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(review.name)
                                    .font(.headline)
                                if review.verified {
                                    Text("VERIFIED")
                                        .font(.caption2.weight(.bold))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(MasonTheme.primary, in: Capsule())
                                        .foregroundStyle(.white)
                                }
                                Spacer()
                                Text(review.ratingLabel)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(MasonTheme.primary)
                            }
                            Text(review.comment)
                                .foregroundStyle(MasonTheme.textSecondary)
                        }
                        .padding(.vertical, 6)

                        if index < recentReviews.count - 1 {
                            Divider()
                        }
                    }
                }
            }
            .navigationTitle("Sex With Mason")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
        }
    }
}

private struct PricingView: View {
    @Binding var showAccount: Bool
    @EnvironmentObject private var store: MasonDataStore
    @AppStorage("ms_customer_name") private var storedCustomerName: String = ""
    @State private var selectedPlanForBooking: PricingPlan?
    @State private var bookingStatusMessage: String?

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    Text("Mason Pricing")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(MasonTheme.textPrimary)
                    Text("Low Quality Service, for a Low Low Price")
                        .foregroundStyle(MasonTheme.textSecondary)
                }

                let plans = store.pricingPlans.isEmpty ? PricingPlan.samples : store.pricingPlans
                ForEach(plans) { plan in
                    Card {
                        Text(plan.title)
                            .font(.title3.bold())
                            .foregroundStyle(MasonTheme.textPrimary)

                        Text(plan.price)
                            .font(.system(size: 34, weight: .heavy, design: .rounded))
                            .foregroundStyle(MasonTheme.primary)

                        Text(plan.subtitle)
                            .foregroundStyle(MasonTheme.textSecondary)

                        ForEach(plan.features, id: \.self) { feature in
                            Label(feature, systemImage: "checkmark.circle.fill")
                                .foregroundStyle(MasonTheme.textPrimary)
                                .labelStyle(.titleAndIcon)
                        }

                        Button {
                            selectedPlanForBooking = plan
                        } label: {
                            Label(plan.cta, systemImage: "calendar.badge.plus")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(MasonTheme.primary)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }

                if let bookingStatusMessage {
                    Card {
                        Text(bookingStatusMessage)
                            .font(.footnote)
                            .foregroundStyle(MasonTheme.textPrimary)
                    }
                }

                Card {
                    Text("Need a custom session?")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)
                    Text("Contact Mason for volume discounts and enterprise offerings.")
                        .foregroundStyle(MasonTheme.textSecondary)
                }
            }
            .navigationTitle("Pricing")
            .sheet(item: $selectedPlanForBooking) { plan in
                BookingSheetView(
                    plan: plan,
                    storedCustomerName: $storedCustomerName
                ) { message in
                    bookingStatusMessage = message
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
        }
    }
}

private struct BookingSheetView: View {
    let plan: PricingPlan
    @Binding var storedCustomerName: String
    let onBooked: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @AppStorage("ms_auth_user_id") private var authUserID: String = ""
    @AppStorage("ms_auth_email") private var authEmail: String = ""

    @State private var name: String = ""
    @State private var contact: String = ""
    @State private var details: String = ""
    @State private var location: String = ""
    @State private var durationMinutes: String = "60"
    @State private var scheduledFor: Date = .now.addingTimeInterval(3600)
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var showSuccessAnimation = false
    @State private var successScale: CGFloat = 0.5
    @State private var successOpacity: Double = 0

    var body: some View {
        NavigationStack {
            Form {
                Section("Plan") {
                    Text(plan.title).font(.headline)
                    Text(plan.price).foregroundStyle(MasonTheme.primary)
                    Text(plan.subtitle).foregroundStyle(MasonTheme.textSecondary)
                }

                Section("Booking details") {
                    TextField("Your name", text: $name)
                    TextField("Contact (email/phone)", text: $contact)
                    DatePicker("Scheduled for", selection: $scheduledFor)
                    TextField("Duration (minutes)", text: $durationMinutes)
                    TextField("Location (optional)", text: $location)
                    TextField("Notes/details", text: $details, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Book Session")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSubmitting ? "Booking..." : "Confirm") {
                        Task { await submitBooking() }
                    }
                    .disabled(isSubmitting || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .task {
                if name.isEmpty {
                    name = storedCustomerName
                }
                if contact.isEmpty {
                    contact = authEmail
                }
            }
            .overlay {
                if showSuccessAnimation {
                    ZStack {
                        Color.black.opacity(0.2).ignoresSafeArea()
                        VStack(spacing: 10) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 72))
                                .foregroundStyle(.green)
                            Text("Session Booked")
                                .font(.title3.bold())
                                .foregroundStyle(MasonTheme.textPrimary)
                        }
                        .padding(24)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .scaleEffect(successScale)
                        .opacity(successOpacity)
                    }
                    .transition(.opacity)
                }
            }
        }
    }

    private func submitBooking() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        guard let client = SupabaseRESTClient.fromBundle() else {
            errorMessage = "Supabase is not configured."
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }
        errorMessage = nil

        do {
            let duration = Int(durationMinutes.trimmingCharacters(in: .whitespacesAndNewlines))
            let request = SessionBookingRequest(
                customerName: trimmedName,
                contact: contact.trimmingCharacters(in: .whitespacesAndNewlines),
                details: details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Booked via app — \(plan.title)" : details.trimmingCharacters(in: .whitespacesAndNewlines),
                location: location.trimmingCharacters(in: .whitespacesAndNewlines),
                durationMinutes: duration,
                price: plan.amount,
                scheduledFor: scheduledFor,
                plan: plan.title
            )
            let sessionID = try await client.createSessionBooking(
                request: request,
                userID: authUserID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : authUserID
            )
            storedCustomerName = trimmedName
            onBooked("Booking confirmed. Session ID: \(sessionID)")
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                showSuccessAnimation = true
                successScale = 1
                successOpacity = 1
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
                dismiss()
            }
        } catch {
            errorMessage = "Booking failed: \(error.localizedDescription)"
        }
    }
}

private struct WhyMasonView: View {
    @Binding var showAccount: Bool
    @EnvironmentObject private var store: MasonDataStore

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    Text("Why Mason?")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(MasonTheme.textPrimary)

                    Text("Mason Wants To FUCK")
                        .foregroundStyle(MasonTheme.textSecondary)

                    Text("Slow Ass response • No communication • Straight Business")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(MasonTheme.primary)
                        .clipShape(Capsule())
                }

                Card {
                    Text("What clients value most")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    let whyItems = store.whyItems.isEmpty ? WhyItem.samples : store.whyItems
                    ForEach(whyItems) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.headline)
                                .foregroundStyle(MasonTheme.textPrimary)
                            Text(item.body)
                                .foregroundStyle(MasonTheme.textSecondary)
                        }
                        .padding(.vertical, 5)
                    }
                }

                Card {
                    Text("Client quotes")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    let quotes = store.quoteItems.isEmpty ? QuoteItem.samples : store.quoteItems
                    ForEach(quotes) { quote in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\"\(quote.quote)\"")
                                .italic()
                                .foregroundStyle(MasonTheme.textPrimary)
                            Text("- \(quote.author)")
                                .font(.subheadline)
                                .foregroundStyle(MasonTheme.textSecondary)
                        }
                        .padding(.vertical, 5)
                    }
                }

                Card {
                    Text("Weiner length comparison")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    ForEach(MeasurementItem.samples) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(item.label)
                                    .font(.headline)
                                Spacer()
                                Text("\(item.valueCM, specifier: "%.2f") cm")
                                    .foregroundStyle(MasonTheme.textSecondary)
                            }

                            GeometryReader { geo in
                                let maxCM = MeasurementItem.samples.map(\.valueCM).max() ?? 1
                                let width = max(8, (item.valueCM / maxCM) * geo.size.width)

                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(item.color)
                                    .frame(width: width, height: 18)
                            }
                            .frame(height: 18)
                        }
                        .padding(.vertical, 4)
                    }
                }

                Card {
                    Text("Want Mason to FUCK you? Book a session.")
                        .font(.headline)
                        .foregroundStyle(MasonTheme.textPrimary)
                    Text("View Pricing")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(MasonTheme.primary)
                        .clipShape(Capsule())
                }
            }
            .navigationTitle("Why Mason")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
        }
    }
}

private struct FlicksView: View {
    @Binding var showAccount: Bool
    @AppStorage("ms_device_id") private var deviceID: String = ""
    @AppStorage("ms_customer_name") private var customerName: String = ""
    @AppStorage("flicks_muted") private var flicksMuted: Bool = false

    @State private var flicks: [FlickItem] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedVideoItem: PhotosPickerItem?
    @State private var selectedVideoData: Data?
    @State private var showUploadSheet = false
    @State private var uploadCaption = ""
    @State private var uploadAuthor = ""
    @State private var commentDrafts: [String: String] = [:]
    @State private var uploadBusy = false
    @State private var activeCommentsFlick: FlickItem?

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ZStack {
                    Color.black.ignoresSafeArea()

                    if isLoading {
                        ProgressView("Loading Flicks...")
                            .tint(.white)
                    } else if let errorMessage {
                        VStack(spacing: 12) {
                            Text("Flicks")
                                .font(.system(size: 38, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(errorMessage)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                        }
                    } else if flicks.isEmpty {
                        VStack(spacing: 10) {
                            Text("No flicks yet")
                                .font(.title.bold())
                                .foregroundStyle(.white)
                            Text("Upload the first vertical clip.")
                                .foregroundStyle(.white.opacity(0.75))
                        }
                    } else {
                        ScrollView(.vertical) {
                            LazyVStack(spacing: 0) {
                                ForEach(flicks) { flick in
                                    FlickReelPage(
                                        flick: flick,
                                        height: geo.size.height,
                                        isMuted: $flicksMuted,
                                        onToggleLike: { Task { await toggleLike(flick: flick) } },
                                        onLikeIfNeeded: {
                                            if !flick.likedByMe {
                                                Task { await toggleLike(flick: flick) }
                                            }
                                        },
                                        onComment: { activeCommentsFlick = flick }
                                    )
                                    .id(flick.id)
                                    .frame(width: geo.size.width, height: geo.size.height)
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .ignoresSafeArea()
                        .scrollIndicators(.hidden)
                        .scrollTargetBehavior(.paging)
                    }
                }
            }
            .navigationTitle("Flicks")
            .toolbar {
                #if os(macOS)
                ToolbarItem(placement: .navigation) {
                    PhotosPicker(selection: $selectedVideoItem, matching: .videos) {
                        Label("Upload", systemImage: "plus.circle.fill")
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                }
                #else
                ToolbarItem(placement: .topBarLeading) {
                    PhotosPicker(selection: $selectedVideoItem, matching: .videos) {
                        Label("Upload", systemImage: "plus.circle.fill")
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                }
                #endif
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
            .task {
                ensureDeviceID()
                if uploadAuthor.isEmpty {
                    uploadAuthor = customerName
                }
                await loadFlicks()
            }
            .onChange(of: selectedVideoItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self) {
                        selectedVideoData = data
                        uploadCaption = ""
                        uploadAuthor = customerName
                        showUploadSheet = true
                    } else {
                        errorMessage = "Could not load selected video."
                    }
                    selectedVideoItem = nil
                }
            }
            .sheet(isPresented: $showUploadSheet) {
                NavigationStack {
                    Form {
                        Section("Clip details") {
                            TextField("Caption", text: $uploadCaption)
                            TextField("Display name", text: $uploadAuthor)
                        }
                    }
                    .navigationTitle("Upload Flick")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") {
                                showUploadSheet = false
                            }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button(uploadBusy ? "Uploading..." : "Post") {
                                Task { await uploadFlick() }
                            }
                            .disabled(uploadBusy || selectedVideoData == nil)
                        }
                    }
                }
            }
            .sheet(item: $activeCommentsFlick) { flick in
                NavigationStack {
                    VStack(spacing: 0) {
                        List {
                            if flick.comments.isEmpty {
                                Text("No comments yet.")
                                    .foregroundStyle(MasonTheme.textSecondary)
                            } else {
                                ForEach(flick.comments) { comment in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(comment.authorDisplay)
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(MasonTheme.textSecondary)
                                        Text(comment.body)
                                    }
                                }
                            }
                        }

                        HStack {
                            TextField("Add a comment...", text: Binding(
                                get: { commentDrafts[flick.id] ?? "" },
                                set: { commentDrafts[flick.id] = $0 }
                            ))
                            .textFieldStyle(.roundedBorder)

                            Button("Send") {
                                Task { await addComment(to: flick.id) }
                            }
                            .disabled((commentDrafts[flick.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                        .padding(12)
                        .background(.ultraThinMaterial)
                    }
                    .navigationTitle("Comments")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { activeCommentsFlick = nil }
                        }
                    }
                }
            }
        }
    }

    private func ensureDeviceID() {
        if deviceID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            deviceID = UUID().uuidString
        }
    }

    private func loadFlicks() async {
        guard let client = SupabaseRESTClient.fromBundle() else {
            errorMessage = "Supabase is not configured."
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            flicks = try await client.fetchFlicks(forDevice: deviceID)
            errorMessage = nil
        } catch {
            errorMessage = "Failed loading flicks: \(error.localizedDescription)"
        }
    }

    private func uploadFlick() async {
        guard let data = selectedVideoData, let client = SupabaseRESTClient.fromBundle() else { return }
        uploadBusy = true
        defer { uploadBusy = false }
        do {
            let displayName = uploadAuthor.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? (customerName.isEmpty ? "Anonymous" : customerName)
                : uploadAuthor.trimmingCharacters(in: .whitespacesAndNewlines)
            let path = try await client.uploadFlickVideo(data: data, fileExtension: "mov")
            _ = try await client.createFlick(
                caption: uploadCaption.trimmingCharacters(in: .whitespacesAndNewlines),
                videoPath: path,
                authorName: displayName,
                deviceID: deviceID
            )
            selectedVideoData = nil
            showUploadSheet = false
            await loadFlicks()
        } catch {
            errorMessage = "Upload failed: \(error.localizedDescription)"
        }
    }

    private func toggleLike(flick: FlickItem) async {
        guard let client = SupabaseRESTClient.fromBundle() else { return }
        do {
            if flick.likedByMe {
                try await client.removeLike(flickID: flick.id, deviceID: deviceID)
            } else {
                try await client.addLike(flickID: flick.id, deviceID: deviceID)
            }
            await loadFlicks()
        } catch {
            errorMessage = "Like update failed: \(error.localizedDescription)"
        }
    }

    private func addComment(to flickID: String) async {
        let draft = (commentDrafts[flickID] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !draft.isEmpty, let client = SupabaseRESTClient.fromBundle() else { return }
        do {
            let author = customerName.isEmpty ? "Anonymous" : customerName
            try await client.addComment(flickID: flickID, author: author, body: draft, deviceID: deviceID)
            commentDrafts[flickID] = ""
            await loadFlicks()
            if let active = activeCommentsFlick {
                activeCommentsFlick = flicks.first(where: { $0.id == active.id })
            }
        } catch {
            errorMessage = "Comment failed: \(error.localizedDescription)"
        }
    }
}

private struct FlickReelPage: View {
    let flick: FlickItem
    let height: CGFloat
    @Binding var isMuted: Bool
    let onToggleLike: () -> Void
    let onLikeIfNeeded: () -> Void
    let onComment: () -> Void

    @State private var player: AVPlayer?
    @State private var isPlaying = true
    @State private var duration: Double = 0
    @State private var progress: Double = 0
    @State private var isScrubbing = false
    @State private var timeObserver: Any?
    @State private var showBigHeart = false
    @State private var showPlayPauseIcon = false
    @State private var playPauseIconName = "pause.fill"

    var body: some View {
        ZStack(alignment: .bottom) {
            FlickVideoPlayerView(player: player)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
                .contentShape(Rectangle())
                .gesture(
                    ExclusiveGesture(
                        TapGesture(count: 2),
                        TapGesture(count: 1)
                    )
                    .onEnded { value in
                        switch value {
                        case .first:
                            onLikeIfNeeded()
                            showHeartBurst()
                        case .second:
                            togglePlayPause()
                        }
                    }
                )

            LinearGradient(
                colors: [.clear, .black.opacity(0.75)],
                startPoint: .top,
                endPoint: .bottom
            )
            .allowsHitTesting(false)

            if showBigHeart {
                Image(systemName: "heart.fill")
                    .font(.system(size: 110))
                    .foregroundStyle(.white, .red)
                    .shadow(radius: 12)
                    .transition(.scale.combined(with: .opacity))
            }

            if showPlayPauseIcon {
                Image(systemName: playPauseIconName)
                    .font(.system(size: 52, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(20)
                    .background(.black.opacity(0.35))
                    .clipShape(Circle())
            }

            HStack(alignment: .bottom, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(flick.authorName ?? "Anonymous")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(flick.caption.isEmpty ? "Untitled clip" : flick.caption)
                        .font(.subheadline)
                        .foregroundStyle(.white)
                    Text(flick.prettyDate)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(spacing: 18) {
                    Button(action: onToggleLike) {
                        VStack(spacing: 4) {
                            Image(systemName: flick.likedByMe ? "heart.fill" : "heart")
                                .font(.system(size: 28, weight: .semibold))
                                .foregroundStyle(flick.likedByMe ? .red : .white)
                            Text("\(flick.likeCount)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                        }
                    }
                    .buttonStyle(.plain)

                    Button(action: onComment) {
                        VStack(spacing: 4) {
                            Image(systemName: "message.fill")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("\(flick.commentCount)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                        }
                    }
                    .buttonStyle(.plain)

                    Button {
                        isMuted.toggle()
                        player?.isMuted = isMuted
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(.white)
                            Text(isMuted ? "Muted" : "Sound")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.white)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 28)
        }
        .frame(height: height)
        .background(Color.black)
        .overlay(alignment: .bottom) {
            VStack(spacing: 3) {
                Slider(
                    value: Binding(
                        get: { progress },
                        set: { progress = $0 }
                    ),
                    in: 0...(duration > 0 ? duration : 1),
                    onEditingChanged: { editing in
                        isScrubbing = editing
                        guard !editing else { return }
                        player?.seek(to: CMTime(seconds: progress, preferredTimescale: 600))
                    }
                )
                .tint(.white)

                HStack {
                    Text(timeString(progress))
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.85))
                    Spacer()
                    Text(timeString(duration))
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 8)
        }
        .onAppear {
            setupPlayer()
        }
        .onDisappear {
            teardownPlayer()
        }
    }

    private func setupPlayer() {
        if player == nil {
            let av = AVPlayer(url: flick.videoURL)
            av.isMuted = isMuted
            player = av
            duration = av.currentItem?.asset.duration.seconds ?? 0
            let interval = CMTime(seconds: 0.2, preferredTimescale: 600)
            timeObserver = av.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
                if !isScrubbing {
                    progress = time.seconds
                }
                let itemDuration = av.currentItem?.duration.seconds ?? 0
                if itemDuration.isFinite && itemDuration > 0 {
                    duration = itemDuration
                }
            }
        }
        player?.isMuted = isMuted
        player?.play()
        isPlaying = true
    }

    private func teardownPlayer() {
        player?.pause()
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        timeObserver = nil
    }

    private func togglePlayPause() {
        guard let player else { return }
        if isPlaying {
            player.pause()
            isPlaying = false
            playPauseIconName = "play.fill"
        } else {
            player.play()
            isPlaying = true
            playPauseIconName = "pause.fill"
        }
        withAnimation(.easeOut(duration: 0.15)) {
            showPlayPauseIcon = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation(.easeIn(duration: 0.2)) {
                showPlayPauseIcon = false
            }
        }
    }

    private func showHeartBurst() {
        withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) {
            showBigHeart = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeOut(duration: 0.2)) {
                showBigHeart = false
            }
        }
    }

    private func timeString(_ seconds: Double) -> String {
        guard seconds.isFinite && seconds >= 0 else { return "0:00" }
        let total = Int(seconds.rounded())
        let mins = total / 60
        let secs = total % 60
        return "\(mins):" + String(format: "%02d", secs)
    }
}

private struct FlickVideoPlayerView: View {
    let player: AVPlayer?

    var body: some View {
        VideoPlayer(player: player)
            .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)) { note in
                guard let endedItem = note.object as? AVPlayerItem, endedItem == player?.currentItem else { return }
                player?.seek(to: .zero)
                player?.play()
            }
    }
}

private struct ReviewsView: View {
    @Binding var showAccount: Bool
    @EnvironmentObject private var store: MasonDataStore

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    let reviews = store.reviews.isEmpty ? ReviewItem.samples : store.reviews
                    let count = reviews.count
                    let average = count == 0 ? 0 : reviews.map(\.rating).reduce(0, +) / Double(count)

                    Text("Mason Reviews")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(MasonTheme.textPrimary)
                    Text("Share feedback - it helps improve mason's drive.")
                        .foregroundStyle(MasonTheme.textSecondary)

                    HStack {
                        Text(String(format: "%.1f", average))
                            .font(.system(size: 38, weight: .heavy, design: .rounded))
                            .foregroundStyle(MasonTheme.primary)
                        VStack(alignment: .leading) {
                            Text("★★★★★")
                                .foregroundStyle(.yellow)
                            Text("(\(count) reviews)")
                                .foregroundStyle(MasonTheme.textSecondary)
                                .font(.subheadline)
                        }
                    }

                    if let loadError = store.lastLoadError {
                        Text(loadError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                let reviews = store.reviews.isEmpty ? ReviewItem.samples : store.reviews
                ForEach(reviews) { review in
                    Card {
                        HStack {
                            Text(review.name)
                                .font(.headline)
                                .foregroundStyle(MasonTheme.textPrimary)
                            if review.verified {
                                Text("VERIFIED")
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(MasonTheme.primary, in: Capsule())
                                    .foregroundStyle(.white)
                            }
                            Spacer()
                            Text(review.ratingLabel)
                                .foregroundStyle(MasonTheme.primary)
                                .font(.subheadline.weight(.semibold))
                        }

                        Text(review.comment)
                            .foregroundStyle(MasonTheme.textSecondary)
                    }
                }
            }
            .navigationTitle("Reviews")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
        }
    }
}

private struct ContactView: View {
    @Binding var showAccount: Bool
    @AppStorage("ms_customer_name") private var storedName: String = ""
    @AppStorage("ms_conversation_id") private var storedConversationID: String = ""
    @AppStorage("ms_ticket_ids") private var storedTicketIDsJSON: String = "[]"

    @State private var name: String = ""
    @State private var startMessage: String = ""
    @State private var resumeConversationID: String = ""
    @State private var tickets: [ConversationSummary] = []
    @State private var ticketIDs: [String] = []
    @State private var chatError: String?
    @State private var isBusy = false
    @State private var hasInitialized = false
    @State private var path: [String] = []

    var body: some View {
        NavigationStack(path: $path) {
            ScreenContainer {
                Card {
                    Text("Contact Mason")
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundStyle(MasonTheme.textPrimary)

                    Text("Start a direct chat, or pick up where you left off.")
                        .foregroundStyle(MasonTheme.textSecondary)

                    Text("Fast response • Clear communication • No fluff")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(MasonTheme.primary)
                        .clipShape(Capsule())
                }

                Card {
                    Text("New ticket")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    TextField("Your name", text: $name)
                        .textFieldStyle(.roundedBorder)

                    TextField("Tell Mason what you need...", text: $startMessage, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...7)

                    Button {
                        Task { await createTicketAndSendInitialMessage() }
                    } label: {
                        Label("Send & Open Chat", systemImage: "paperplane.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(MasonTheme.primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(isBusy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || startMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                Card {
                    Text("Resume a conversation")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    Text("Use your saved conversation link or ID.")
                        .foregroundStyle(MasonTheme.textSecondary)

                    TextField("Conversation ID", text: $resumeConversationID)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task { await openConversationFromResumeField() }
                    } label: {
                        Label("Open Conversation", systemImage: "text.bubble.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(MasonTheme.primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(isBusy || resumeConversationID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if !tickets.isEmpty {
                    Card {
                        Text("Conversations")
                            .font(.title3.bold())
                            .foregroundStyle(MasonTheme.textPrimary)

                        VStack(spacing: 8) {
                            ForEach(tickets) { ticket in
                                Button {
                                    storedConversationID = ticket.id
                                    path.append(ticket.id)
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(ticket.customerName?.isEmpty == false ? ticket.customerName! : "Ticket \(ticket.id.prefix(8))")
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(MasonTheme.textPrimary)
                                            Text(ticket.status.uppercased())
                                                .font(.caption)
                                                .foregroundStyle(ticket.status == "closed" ? .red : MasonTheme.textSecondary)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .foregroundStyle(MasonTheme.textSecondary)
                                    }
                                    .padding(10)
                                    .background(Color.black.opacity(0.04))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                if let chatError {
                    Card {
                        Text(chatError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Contact")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAccount = true
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                            .foregroundStyle(MasonTheme.primary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open account")
                }
            }
            .task {
                guard !hasInitialized else { return }
                hasInitialized = true
                name = storedName
                ticketIDs = decodeTicketIDs(from: storedTicketIDsJSON)
                if !storedConversationID.isEmpty && !ticketIDs.contains(storedConversationID) {
                    ticketIDs.insert(storedConversationID, at: 0)
                    saveTicketIDs()
                }
                await loadSavedTickets()
            }
            .navigationDestination(for: String.self) { conversationID in
                ConversationThreadView(conversationID: conversationID, defaultName: $storedName)
            }
        }
    }

    private func createTicketAndSendInitialMessage() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedMessage = startMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty, !trimmedMessage.isEmpty else { return }
        guard let client = SupabaseRESTClient.fromBundle() else {
            chatError = "Supabase is not configured."
            return
        }

        isBusy = true
        defer { isBusy = false }
        do {
            let id = try await client.createConversation(customerName: trimmedName)
            try await client.sendMessage(conversationID: id, sender: trimmedName, body: trimmedMessage, senderRole: "user")
            try await client.touchConversation(conversationID: id)

            storedName = trimmedName
            storedConversationID = id
            startMessage = ""
            resumeConversationID = id
            addTicketID(id)

            await loadSavedTickets()
            path.append(id)
            chatError = nil
        } catch {
            chatError = "Failed to create/send: \(error.localizedDescription)"
        }
    }

    private func openConversationFromResumeField() async {
        let id = resumeConversationID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty else { return }
        addTicketID(id)
        storedConversationID = id
        await loadSavedTickets()
        path.append(id)
    }

    private func loadSavedTickets() async {
        guard let client = SupabaseRESTClient.fromBundle(), !ticketIDs.isEmpty else {
            tickets = []
            return
        }
        do {
            let loaded = try await client.fetchConversations(ids: ticketIDs)
            let map = Dictionary(uniqueKeysWithValues: loaded.map { ($0.id, $0) })
            tickets = ticketIDs.compactMap { map[$0] }
        } catch {
            chatError = "Failed loading ticket list: \(error.localizedDescription)"
        }
    }

    private func decodeTicketIDs(from value: String) -> [String] {
        let data = Data(value.utf8)
        let parsed = (try? JSONDecoder().decode([String].self, from: data)) ?? []
        return Array(Set(parsed)).filter { !$0.isEmpty }
    }

    private func saveTicketIDs() {
        if let data = try? JSONEncoder().encode(ticketIDs), let json = String(data: data, encoding: .utf8) {
            storedTicketIDsJSON = json
        }
    }

    private func addTicketID(_ id: String) {
        ticketIDs.removeAll { $0 == id }
        ticketIDs.insert(id, at: 0)
        if ticketIDs.count > 20 { ticketIDs = Array(ticketIDs.prefix(20)) }
        saveTicketIDs()
    }
}

private struct ConversationThreadView: View {
    let conversationID: String
    @Binding var defaultName: String

    @State private var messages: [ChatMessage] = []
    @State private var status: String = "open"
    @State private var messageText: String = ""
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var didLoad = false

    private let pollTimer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messages) { message in
                            let isMine = message.senderRole == "user"
                            HStack {
                                if isMine { Spacer(minLength: 28) }
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(message.body)
                                        .foregroundStyle(isMine ? .white : MasonTheme.textPrimary)
                                    Text(message.prettyDate)
                                        .font(.caption2)
                                        .foregroundStyle(isMine ? .white.opacity(0.8) : MasonTheme.textSecondary)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 9)
                                .background(isMine ? MasonTheme.primary : Color.black.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                if !isMine { Spacer(minLength: 28) }
                            }
                            .id(message.id)
                            .padding(.horizontal, 12)
                        }
                    }
                    .padding(.vertical, 12)
                }
                .background(Color(red: 0.94, green: 0.97, blue: 0.99))
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            Divider()
            HStack(spacing: 8) {
                TextField(status == "closed" ? "Conversation is closed" : "Message", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
                    .disabled(status == "closed")

                Button {
                    Task { await send() }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(MasonTheme.primary)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || status == "closed")
            }
            .padding(10)
            .background(.ultraThinMaterial)
        }
        .navigationTitle("Chat")
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack {
                    Text("Conversation")
                        .font(.subheadline.weight(.semibold))
                    Text(status.uppercased())
                        .font(.caption2)
                        .foregroundStyle(status == "closed" ? .red : MasonTheme.textSecondary)
                }
            }
        }
        .overlay(alignment: .top) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .padding(8)
            } else if loading {
                ProgressView()
                    .padding(8)
            }
        }
        .task {
            guard !didLoad else { return }
            didLoad = true
            await refresh()
        }
        .onReceive(pollTimer) { _ in
            Task { await refresh() }
        }
    }

    private func refresh() async {
        guard let client = SupabaseRESTClient.fromBundle() else { return }
        loading = true
        defer { loading = false }
        do {
            if let convo = try await client.fetchConversation(conversationID: conversationID) {
                status = convo.status
            }
            messages = try await client.fetchMessages(conversationID: conversationID)
            errorMessage = nil
        } catch {
            errorMessage = "Failed to load messages: \(error.localizedDescription)"
        }
    }

    private func send() async {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, status != "closed", let client = SupabaseRESTClient.fromBundle() else { return }
        do {
            let sender = defaultName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Guest" : defaultName
            try await client.sendMessage(conversationID: conversationID, sender: sender, body: text, senderRole: "user")
            try await client.touchConversation(conversationID: conversationID)
            messageText = ""
            await refresh()
        } catch {
            errorMessage = "Failed to send message: \(error.localizedDescription)"
        }
    }
}

private struct AccountView: View {
    @Binding var selectedTab: AppTab
    @Binding var isPresented: Bool
    @Binding var authAccessToken: String
    @Binding var authUserID: String
    @Binding var authEmail: String
    @AppStorage("ms_browse_as_guest") private var browseAsGuest: Bool = false
    @Binding var showAuthScreen: Bool
    @AppStorage("ms_customer_name") private var customerName: String = ""
    @State private var email: String = ""
    @State private var myBookings: [SessionBookingSummary] = []
    @State private var bookingsError: String?
    @State private var loadingBookings = false

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    HStack(spacing: 14) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 58))
                            .foregroundStyle(MasonTheme.primary)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(customerName.isEmpty ? "Your Account" : customerName)
                                .font(.title2.bold())
                                .foregroundStyle(MasonTheme.textPrimary)
                            Text(authEmail.isEmpty ? "Not signed in" : authEmail)
                                .font(.subheadline)
                                .foregroundStyle(MasonTheme.textSecondary)
                        }
                    }
                }

                Card {
                    Text("Profile")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)
                    TextField("Name", text: $customerName)
                        .textFieldStyle(.roundedBorder)
                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                    if !authUserID.isEmpty {
                        Text("User ID: \(authUserID)")
                            .font(.caption2)
                            .foregroundStyle(MasonTheme.textSecondary)
                    }
                }

                Card {
                    HStack {
                        Text("My Bookings")
                            .font(.title3.bold())
                            .foregroundStyle(MasonTheme.textPrimary)
                        Spacer()
                        if loadingBookings { ProgressView().scaleEffect(0.8) }
                        Button("Refresh") {
                            Task { await loadBookings() }
                        }
                        .buttonStyle(.plain)
                    }

                    if let bookingsError {
                        Text(bookingsError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    if myBookings.isEmpty && !loadingBookings {
                        Text("No bookings yet.")
                            .foregroundStyle(MasonTheme.textSecondary)
                    } else {
                        ForEach(myBookings) { booking in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(booking.status.uppercased())
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(booking.status == "requested" ? MasonTheme.primary : MasonTheme.textSecondary)
                                    Spacer()
                                    Text(booking.prettyDate)
                                        .font(.caption)
                                        .foregroundStyle(MasonTheme.textSecondary)
                                }
                                Text(booking.details?.isEmpty == false ? booking.details! : "Session \(booking.id)")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(MasonTheme.textPrimary)
                                if let contact = booking.contact, !contact.isEmpty {
                                    Text(contact)
                                        .font(.caption)
                                        .foregroundStyle(MasonTheme.textSecondary)
                                }
                            }
                            .padding(.vertical, 4)
                            Divider()
                        }
                    }
                }

                Card {
                    Text("Quick Actions")
                        .font(.title3.bold())
                        .foregroundStyle(MasonTheme.textPrimary)

                    quickAction(title: "Book a Session", systemImage: "calendar.badge.plus", tab: .pricing)
                    quickAction(title: "Open Support Chat", systemImage: "message.fill", tab: .contact)
                    quickAction(title: "See Reviews", systemImage: "star.fill", tab: .reviews)
                    quickAction(title: "Why Mason", systemImage: "sparkles", tab: .why)
                }

                Card {
                    Button {
                        authAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? signInFromGuest()
                            : signOut()
                    } label: {
                        HStack {
                            Label(
                                authAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Sign In" : "Sign Out",
                                systemImage: "rectangle.portrait.and.arrow.right"
                            )
                                .font(.headline)
                                .foregroundStyle(.white)
                            Spacer()
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(Color.red)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("Account")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { isPresented = false }
                }
            }
            .task {
                email = authEmail
                await loadBookings()
            }
        }
    }

    @ViewBuilder
    private func quickAction(title: String, systemImage: String, tab: AppTab) -> some View {
        Button {
            selectedTab = tab
            isPresented = false
        } label: {
            HStack {
                Label(title, systemImage: systemImage)
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(MasonTheme.primary)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func signOut() {
        authAccessToken = ""
        authUserID = ""
        authEmail = ""
        browseAsGuest = false
        isPresented = false
        showAuthScreen = true
    }

    private func signInFromGuest() {
        browseAsGuest = false
        isPresented = false
        showAuthScreen = true
    }

    private func loadBookings() async {
        guard !authUserID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            myBookings = []
            bookingsError = "Sign in to view your bookings."
            return
        }
        guard let client = SupabaseRESTClient.fromBundle() else {
            bookingsError = "Supabase is not configured."
            return
        }
        loadingBookings = true
        defer { loadingBookings = false }
        do {
            myBookings = try await client.fetchSessions(userID: authUserID)
            bookingsError = nil
        } catch {
            bookingsError = "Failed to load bookings: \(error.localizedDescription)"
        }
    }
}

private struct AuthView: View {
    @Binding var authAccessToken: String
    @Binding var authUserID: String
    @Binding var authEmail: String
    @Binding var browseAsGuest: Bool
    @Binding var isPresented: Bool

    @State private var mode: AuthMode = .signIn
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var animateHeader = false
    @State private var animateCard = false
    @State private var showAuthSuccess = false

    var body: some View {
        NavigationStack {
            ScreenContainer {
                Card {
                    HStack(spacing: 10) {
                        Image(systemName: "person.crop.circle.badge.checkmark")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundStyle(MasonTheme.primary)
                            .scaleEffect(animateHeader ? 1 : 0.7)
                        Text("Welcome")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(MasonTheme.textPrimary)
                    }
                    Text("Sign in to manage bookings and use account features.")
                        .foregroundStyle(MasonTheme.textSecondary)
                }
                .opacity(animateHeader ? 1 : 0)
                .offset(y: animateHeader ? 0 : -14)

                Card {
                    Picker("Mode", selection: $mode) {
                        Text("Sign In").tag(AuthMode.signIn)
                        Text("Create Account").tag(AuthMode.signUp)
                    }
                    .pickerStyle(.segmented)

                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        Text(loading ? "Please wait..." : (mode == .signIn ? "Sign In" : "Create Account"))
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(MasonTheme.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(loading || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.count < 6)

                    Button {
                        browseAsGuest = true
                        authAccessToken = ""
                        authUserID = ""
                        authEmail = ""
                        isPresented = false
                    } label: {
                        Text("Browse as Guest")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(MasonTheme.textPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.black.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
                .scaleEffect(animateCard ? 1 : 0.93)
                .opacity(animateCard ? 1 : 0)
            }
            .navigationTitle("Login")
            .task {
                withAnimation(.easeOut(duration: 0.35)) {
                    animateHeader = true
                }
                withAnimation(.spring(response: 0.55, dampingFraction: 0.78).delay(0.1)) {
                    animateCard = true
                }
            }
            .overlay {
                if showAuthSuccess {
                    ZStack {
                        Color.black.opacity(0.2).ignoresSafeArea()
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 72))
                                .foregroundStyle(.green)
                            Text("Signed In")
                                .font(.title3.bold())
                                .foregroundStyle(MasonTheme.textPrimary)
                        }
                        .padding(22)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
        }
    }

    private func submit() async {
        let cleanEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleanEmail.isEmpty, !password.isEmpty else { return }
        guard let client = SupabaseRESTClient.fromBundle() else {
            errorMessage = "Supabase is not configured."
            return
        }
        loading = true
        defer { loading = false }
        do {
            let session: AuthSession
            if mode == .signIn {
                session = try await client.signIn(email: cleanEmail, password: password)
            } else {
                session = try await client.signUp(email: cleanEmail, password: password)
            }
            authAccessToken = session.accessToken
            authUserID = session.userID
            authEmail = session.email
            browseAsGuest = false
            errorMessage = nil
            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                showAuthSuccess = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                isPresented = false
            }
        } catch {
            errorMessage = "Auth failed: \(error.localizedDescription)"
        }
    }
}

private enum AuthMode: Hashable {
    case signIn
    case signUp
}

private struct StatLine: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)
                .foregroundStyle(MasonTheme.textPrimary)
            Text(detail)
                .foregroundStyle(MasonTheme.textSecondary)
        }
        .padding(.vertical, 4)
    }
}

private struct PricingPlan: Identifiable {
    let id = UUID()
    let title: String
    let price: String
    let subtitle: String
    let features: [String]
    let cta: String
    let amount: Double?

    static let samples: [PricingPlan] = [
        PricingPlan(
            title: "Basic",
            price: "$2.50",
            subtitle: "Per session",
            features: ["Will slap it around a bit", "No bust is included"],
            cta: "Book Basic",
            amount: 2.5
        ),
        PricingPlan(
            title: "The 'Happy Ending' Special",
            price: "$5",
            subtitle: "Per stroke",
            features: ["Mason will get it done QUICK!", "Max 10 strokes"],
            cta: "Book Happy Ending",
            amount: 5
        ),
        PricingPlan(
            title: "The 'Finishing' Move",
            price: "$100",
            subtitle: "Custom",
            features: ["Priority scheduling", "Full stroke experience", "Guaranteed bust"],
            cta: "Book Finishing Move",
            amount: 100
        )
    ]
}

private struct ReviewItem: Identifiable {
    let id = UUID()
    let name: String
    let rating: Double
    let comment: String

    var ratingLabel: String { String(format: "%.1f★", rating) }

    static let samples: [ReviewItem] = [
        ReviewItem(name: "Client A", rating: 5.0, comment: "Your quote here."),
        ReviewItem(name: "Client B", rating: 4.5, comment: "Your quote here."),
        ReviewItem(name: "Client C", rating: 5.0, comment: "Your quote here.")
    ]
}

private struct WhyItem: Identifiable {
    let id = UUID()
    let title: String
    let body: String

    static let samples: [WhyItem] = [
        WhyItem(title: "Some good top", body: "Clear expectations and straight gagging from day one."),
        WhyItem(title: "Hands-on quality", body: "Every detail gets personal attention and fast iteration."),
        WhyItem(title: "Partial follow-through", body: "Finishes sometimes")
    ]
}

private struct QuoteItem: Identifiable {
    let id = UUID()
    let quote: String
    let author: String

    static let samples: [QuoteItem] = [
        QuoteItem(quote: "Your quote here.", author: "Client Name, Company/Role"),
        QuoteItem(quote: "Your quote here.", author: "Client Name, Company/Role"),
        QuoteItem(quote: "Your quote here.", author: "Client Name, Company/Role")
    ]
}

private struct MeasurementItem: Identifiable {
    let id = UUID()
    let label: String
    let valueCM: Double
    let color: Color

    static let samples: [MeasurementItem] = [
        MeasurementItem(label: "Mason", valueCM: 0.1, color: MasonTheme.primary),
        MeasurementItem(label: "Average human", valueCM: 13, color: .indigo),
        MeasurementItem(label: "Ant", valueCM: 0.3, color: .orange),
        MeasurementItem(label: "Molecular Atom", valueCM: 0.00001, color: .pink)
    ]
}

private struct ConversationSummary: Identifiable {
    let id: String
    let status: String
    let customerName: String?
}

private struct ChatMessage: Identifiable {
    let id: String
    let sender: String
    let body: String
    let senderRole: String?
    let createdAt: String?

    var prettyDate: String {
        guard let createdAt, let date = ISO8601DateFormatter().date(from: createdAt) else {
            return "Just now"
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct SessionBookingRequest {
    let customerName: String
    let contact: String
    let details: String
    let location: String
    let durationMinutes: Int?
    let price: Double?
    let scheduledFor: Date?
    let plan: String
}

private struct SessionBookingSummary: Identifiable {
    let id: String
    let status: String
    let details: String?
    let contact: String?
    let scheduledFor: String?
    let createdAt: String?

    var prettyDate: String {
        let raw = scheduledFor ?? createdAt
        guard let raw, let date = ISO8601DateFormatter().date(from: raw) else { return "No date" }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct AuthSession {
    let accessToken: String
    let userID: String
    let email: String
}

private struct FlickItem: Identifiable {
    let id: String
    let caption: String
    let videoPath: String
    let authorName: String?
    let createdAt: String?
    let likeCount: Int
    let commentCount: Int
    let likedByMe: Bool
    let comments: [FlickComment]
    let videoURL: URL

    var prettyDate: String {
        guard let createdAt, let date = ISO8601DateFormatter().date(from: createdAt) else {
            return "Just now"
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct FlickComment: Identifiable {
    let id: String
    let author: String?
    let body: String
    let createdAt: String?

    var authorDisplay: String { (author?.isEmpty == false ? author! : "Anonymous") }
}

@MainActor
private final class MasonDataStore: ObservableObject {
    @Published var pricingPlans: [PricingPlan] = []
    @Published var reviews: [ReviewItem] = []
    @Published var whyItems: [WhyItem] = []
    @Published var quoteItems: [QuoteItem] = []
    @Published var lastLoadError: String?
    @Published var isLoading = false

    private var hasLoaded = false

    func loadIfNeeded() async {
        guard !hasLoaded else { return }
        hasLoaded = true
        await refresh()
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        guard let client = SupabaseRESTClient.fromBundle() else {
            lastLoadError = "Supabase config missing. Check SUPABASE_URL and SUPABASE_ANON_KEY in target Info settings."
            return
        }
        var errors: [String] = []

        async let pricingTask = client.fetchPricingPlans()
        async let reviewsTask = client.fetchRecentReviews(limit: 40)
        async let whyTask = client.fetchWhyValueCards()
        async let quotesTask = client.fetchWhyQuotes()

        do { pricingPlans = try await pricingTask } catch { pricingPlans = []; errors.append("pricing_plans: \(error.localizedDescription)") }
        do { reviews = try await reviewsTask } catch { reviews = []; errors.append("reviews: \(error.localizedDescription)") }
        do { whyItems = try await whyTask } catch { whyItems = []; errors.append("why_value_cards: \(error.localizedDescription)") }
        do { quoteItems = try await quotesTask } catch { quoteItems = []; errors.append("why_quotes: \(error.localizedDescription)") }

        lastLoadError = errors.isEmpty ? nil : "Supabase load issue: " + errors.joined(separator: " | ")
    }
}

private struct SupabaseRESTClient {
    private let restBaseURL: URL
    private let anonKey: String
    private static let defaultURL = "https://hyehyfbnskiybdspkbxe.supabase.co"
    private static let defaultAnonKey = "sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu"

    private enum SupabaseError: LocalizedError {
        case badStatus(Int, String)

        var errorDescription: String? {
            switch self {
            case let .badStatus(code, body):
                return "HTTP \(code) \(body)"
            }
        }
    }

    private var projectRoot: String {
        restBaseURL.absoluteString.replacingOccurrences(of: "/rest/v1", with: "")
    }

    static func fromBundle(bundle: Bundle = .main) -> SupabaseRESTClient? {
        let infoURL = (bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let infoKey = (bundle.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let rawURL = (infoURL?.isEmpty == false) ? infoURL! : defaultURL
        let rawKey = (infoKey?.isEmpty == false) ? infoKey! : defaultAnonKey

        guard let restURL = URL(string: rawURL + "/rest/v1") else {
            print("Invalid SUPABASE_URL: \(rawURL)")
            return nil
        }

        return SupabaseRESTClient(
            restBaseURL: restURL,
            anonKey: rawKey
        )
    }

    func fetchPricingPlans() async throws -> [PricingPlan] {
        let rows: [PricingRow] = try await get(
            table: "pricing_plans",
            select: "title,price,price_subtitle,features,cta_label,cta_amount",
            queryItems: [URLQueryItem(name: "order", value: "sort_order.asc")]
        )

        return rows.map {
            PricingPlan(
                title: $0.title,
                price: $0.price,
                subtitle: $0.priceSubtitle ?? "",
                features: $0.features,
                cta: $0.ctaLabel ?? "Book",
                amount: $0.ctaAmount
            )
        }
    }

    func fetchRecentReviews(limit: Int) async throws -> [ReviewItem] {
        let rows: [ReviewRow] = try await get(
            table: "reviews",
            select: "name,comment,rating,created_at",
            queryItems: [
                URLQueryItem(name: "order", value: "created_at.desc"),
                URLQueryItem(name: "limit", value: String(limit))
            ]
        )

        return rows.map {
            ReviewItem(
                name: ($0.name?.isEmpty == false ? $0.name! : "Anonymous"),
                rating: $0.rating ?? 0,
                comment: $0.comment ?? ""
            )
        }
    }

    func fetchWhyValueCards() async throws -> [WhyItem] {
        let rows: [WhyCardRow] = try await get(
            table: "why_value_cards",
            select: "title,body,sort_order",
            queryItems: [URLQueryItem(name: "order", value: "sort_order.asc")]
        )

        return rows.map { WhyItem(title: $0.title, body: $0.body) }
    }

    func fetchWhyQuotes() async throws -> [QuoteItem] {
        let rows: [QuoteRow] = try await get(
            table: "why_quotes",
            select: "quote,author,sort_order",
            queryItems: [URLQueryItem(name: "order", value: "sort_order.asc")]
        )

        return rows.map { QuoteItem(quote: $0.quote, author: $0.author) }
    }

    func createConversation(customerName: String) async throws -> String {
        let payload = [["customer_name": customerName, "status": "open"]]
        let rows: [ConversationCreateRow] = try await send(
            method: "POST",
            table: "conversations",
            queryItems: [URLQueryItem(name: "select", value: "id")],
            jsonBody: payload,
            preferRepresentation: true
        )
        guard let id = rows.first?.id else {
            throw URLError(.cannotParseResponse)
        }
        return id
    }

    func fetchConversation(conversationID: String) async throws -> ConversationSummary? {
        let rows: [ConversationRow] = try await get(
            table: "conversations",
            select: "id,status,customer_name,last_message_at",
            queryItems: [URLQueryItem(name: "id", value: "eq.\(conversationID)")]
        )
        guard let first = rows.first else { return nil }
        return ConversationSummary(id: first.id, status: first.status ?? "open", customerName: first.customerName)
    }

    func fetchConversations(ids: [String]) async throws -> [ConversationSummary] {
        guard !ids.isEmpty else { return [] }
        let csv = ids.joined(separator: ",")
        let rows: [ConversationRow] = try await get(
            table: "conversations",
            select: "id,status,customer_name,last_message_at",
            queryItems: [URLQueryItem(name: "id", value: "in.(\(csv))")]
        )
        return rows.map { ConversationSummary(id: $0.id, status: $0.status ?? "open", customerName: $0.customerName) }
    }

    func fetchMessages(conversationID: String) async throws -> [ChatMessage] {
        let rows: [ConversationMessageRow] = try await get(
            table: "conversation_messages",
            select: "id,sender,body,sender_role,created_at",
            queryItems: [
                URLQueryItem(name: "conversation_id", value: "eq.\(conversationID)"),
                URLQueryItem(name: "order", value: "created_at.asc")
            ]
        )
        return rows.map {
            ChatMessage(
                id: $0.id,
                sender: $0.sender ?? "Unknown",
                body: $0.body ?? "",
                senderRole: $0.senderRole,
                createdAt: $0.createdAt
            )
        }
    }

    func sendMessage(conversationID: String, sender: String, body: String, senderRole: String) async throws {
        let payload = [[
            "conversation_id": conversationID,
            "sender": sender,
            "body": body,
            "sender_role": senderRole
        ]]
        let _: [ConversationMessageRow] = try await send(
            method: "POST",
            table: "conversation_messages",
            queryItems: [URLQueryItem(name: "select", value: "id")],
            jsonBody: payload,
            preferRepresentation: true
        )
    }

    func touchConversation(conversationID: String) async throws {
        let payload = ["last_message_at": ISO8601DateFormatter().string(from: Date())]
        let _: [ConversationRow] = try await send(
            method: "PATCH",
            table: "conversations",
            queryItems: [URLQueryItem(name: "id", value: "eq.\(conversationID)")],
            jsonBody: payload,
            preferRepresentation: false
        )
    }

    func createSessionBooking(request: SessionBookingRequest, userID: String? = nil) async throws -> String {
        let customer = request.customerName.isEmpty ? "Guest" : request.customerName
        let amount = request.price

        do {
            var orderItem: [String: Any] = [
                "customer_name": customer,
                "email": request.contact,
                "plan": request.plan
            ]
            if let amount { orderItem["amount"] = amount }
            let orderPayload: [[String: Any]] = [orderItem]
            let _: [OrderRow] = try await send(
                method: "POST",
                table: "orders",
                queryItems: [URLQueryItem(name: "select", value: "id")],
                jsonBody: orderPayload,
                preferRepresentation: true
            )

            let announcementPayload: [[String: Any]] = [[
                "message": "New order: \(request.plan) by \(customer)"
            ]]
            let _: [AnnouncementRow] = try await send(
                method: "POST",
                table: "announcements",
                queryItems: [URLQueryItem(name: "select", value: "id")],
                jsonBody: announcementPayload,
                preferRepresentation: true
            )
        } catch {
            // Best-effort: booking should still succeed even if order/announcement tables differ.
            print("Order/announcement write skipped: \(error.localizedDescription)")
        }

        var payload: [String: Any] = [
            "customer_name": customer,
            "contact": request.contact,
            "details": request.details,
            "status": "requested"
        ]
        if let userID, !userID.isEmpty { payload["user_id"] = userID }
        if !request.location.isEmpty { payload["location"] = request.location }
        if let duration = request.durationMinutes { payload["duration_minutes"] = duration }
        if let price = amount { payload["price"] = price }
        if let date = request.scheduledFor {
            payload["scheduled_for"] = ISO8601DateFormatter().string(from: date)
        }

        let rows: [SessionRow] = try await send(
            method: "POST",
            table: "sessions",
            queryItems: [URLQueryItem(name: "select", value: "id")],
            jsonBody: [payload],
            preferRepresentation: true
        )
        guard let id = rows.first?.id else {
            throw URLError(.cannotParseResponse)
        }
        return id
    }

    func fetchSessions(userID: String) async throws -> [SessionBookingSummary] {
        let rows: [SessionDetailsRow] = try await get(
            table: "sessions",
            select: "id,status,details,contact,scheduled_for,created_at",
            queryItems: [
                URLQueryItem(name: "user_id", value: "eq.\(userID)"),
                URLQueryItem(name: "order", value: "created_at.desc")
            ]
        )
        return rows.map {
            SessionBookingSummary(
                id: $0.id,
                status: $0.status ?? "requested",
                details: $0.details,
                contact: $0.contact,
                scheduledFor: $0.scheduledFor,
                createdAt: $0.createdAt
            )
        }
    }

    func signUp(email: String, password: String) async throws -> AuthSession {
        let url = URL(string: "\(projectRoot)/auth/v1/signup")!
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        let response: AuthResponse = try await authRequest(url: url, method: "POST", jsonBody: body)
        guard let accessToken = response.accessToken, let user = response.user else {
            throw SupabaseError.badStatus(400, "No session returned. Check email confirmation settings.")
        }
        return AuthSession(accessToken: accessToken, userID: user.id, email: user.email ?? email)
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        var components = URLComponents(string: "\(projectRoot)/auth/v1/token")!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        let response: AuthResponse = try await authRequest(url: components.url!, method: "POST", jsonBody: body)
        guard let accessToken = response.accessToken, let user = response.user else {
            throw SupabaseError.badStatus(401, "Invalid credentials.")
        }
        return AuthSession(accessToken: accessToken, userID: user.id, email: user.email ?? email)
    }

    func fetchFlicks(forDevice deviceID: String) async throws -> [FlickItem] {
        let rows: [FlickRow] = try await get(
            table: "flicks",
            select: "id,caption,video_path,author_name,created_at",
            queryItems: [URLQueryItem(name: "order", value: "created_at.desc")]
        )

        var result: [FlickItem] = []
        for row in rows {
            let likes = try await fetchLikeCount(flickID: row.id)
            let likedByMe = try await hasLiked(flickID: row.id, deviceID: deviceID)
            let comments = try await fetchComments(flickID: row.id)
            let videoURL = publicVideoURL(path: row.videoPath)
            result.append(
                FlickItem(
                    id: row.id,
                    caption: row.caption ?? "",
                    videoPath: row.videoPath,
                    authorName: row.authorName,
                    createdAt: row.createdAt,
                    likeCount: likes,
                    commentCount: comments.count,
                    likedByMe: likedByMe,
                    comments: comments,
                    videoURL: videoURL
                )
            )
        }
        return result
    }

    func uploadFlickVideo(data: Data, fileExtension: String) async throws -> String {
        let path = "uploads/\(UUID().uuidString).\(fileExtension)"
        try await uploadToStorage(bucket: "flicks", path: path, data: data, contentType: "video/quicktime")
        return path
    }

    func createFlick(caption: String, videoPath: String, authorName: String, deviceID: String) async throws -> String {
        let payload: [[String: Any]] = [[
            "caption": caption,
            "video_path": videoPath,
            "author_name": authorName,
            "user_device": deviceID
        ]]
        let rows: [FlickRow] = try await send(
            method: "POST",
            table: "flicks",
            queryItems: [URLQueryItem(name: "select", value: "id,caption,video_path,author_name,created_at")],
            jsonBody: payload,
            preferRepresentation: true
        )
        guard let id = rows.first?.id else { throw URLError(.cannotParseResponse) }
        return id
    }

    func addLike(flickID: String, deviceID: String) async throws {
        let payload: [[String: Any]] = [[
            "flick_id": flickID,
            "user_device": deviceID
        ]]
        let _: [FlickLikeRow] = try await send(
            method: "POST",
            table: "flick_likes",
            queryItems: [URLQueryItem(name: "select", value: "id")],
            jsonBody: payload,
            preferRepresentation: true
        )
    }

    func removeLike(flickID: String, deviceID: String) async throws {
        let _: [FlickLikeRow] = try await send(
            method: "DELETE",
            table: "flick_likes",
            queryItems: [
                URLQueryItem(name: "flick_id", value: "eq.\(flickID)"),
                URLQueryItem(name: "user_device", value: "eq.\(deviceID)"),
                URLQueryItem(name: "select", value: "id")
            ],
            jsonBody: [:],
            preferRepresentation: true
        )
    }

    func addComment(flickID: String, author: String, body: String, deviceID: String) async throws {
        let payload: [[String: Any]] = [[
            "flick_id": flickID,
            "author_name": author,
            "body": body,
            "user_device": deviceID
        ]]
        let _: [FlickCommentRow] = try await send(
            method: "POST",
            table: "flick_comments",
            queryItems: [URLQueryItem(name: "select", value: "id")],
            jsonBody: payload,
            preferRepresentation: true
        )
    }

    private func fetchLikeCount(flickID: String) async throws -> Int {
        let rows: [FlickLikeRow] = try await get(
            table: "flick_likes",
            select: "id",
            queryItems: [URLQueryItem(name: "flick_id", value: "eq.\(flickID)")]
        )
        return rows.count
    }

    private func hasLiked(flickID: String, deviceID: String) async throws -> Bool {
        let rows: [FlickLikeRow] = try await get(
            table: "flick_likes",
            select: "id",
            queryItems: [
                URLQueryItem(name: "flick_id", value: "eq.\(flickID)"),
                URLQueryItem(name: "user_device", value: "eq.\(deviceID)"),
                URLQueryItem(name: "limit", value: "1")
            ]
        )
        return !rows.isEmpty
    }

    private func fetchComments(flickID: String) async throws -> [FlickComment] {
        let rows: [FlickCommentRow] = try await get(
            table: "flick_comments",
            select: "id,author_name,body,created_at",
            queryItems: [
                URLQueryItem(name: "flick_id", value: "eq.\(flickID)"),
                URLQueryItem(name: "order", value: "created_at.desc"),
                URLQueryItem(name: "limit", value: "20")
            ]
        )
        return rows.map {
            FlickComment(id: $0.id, author: $0.authorName, body: $0.body ?? "", createdAt: $0.createdAt)
        }
    }

    private func publicVideoURL(path: String) -> URL {
        let root = restBaseURL.absoluteString.replacingOccurrences(of: "/rest/v1", with: "")
        return URL(string: "\(root)/storage/v1/object/public/flicks/\(path)")!
    }

    private func get<T: Decodable>(table: String, select: String, queryItems: [URLQueryItem]) async throws -> T {
        var components = URLComponents(url: restBaseURL.appendingPathComponent(table), resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "select", value: select)]
        items.append(contentsOf: queryItems)
        components.queryItems = items

        var request = URLRequest(url: components.url!)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "No response body"
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SupabaseError.badStatus(code, body)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    private func send<T: Decodable>(
        method: String,
        table: String,
        queryItems: [URLQueryItem],
        jsonBody: Any,
        preferRepresentation: Bool
    ) async throws -> T {
        var components = URLComponents(url: restBaseURL.appendingPathComponent(table), resolvingAgainstBaseURL: false)!
        components.queryItems = queryItems

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(preferRepresentation ? "return=representation" : "return=minimal", forHTTPHeaderField: "Prefer")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "No response body"
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SupabaseError.badStatus(code, body)
        }

        if data.isEmpty {
            return try JSONDecoder().decode(T.self, from: Data("[]".utf8))
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func uploadToStorage(bucket: String, path: String, data: Data, contentType: String) async throws {
        let root = projectRoot
        guard let encodedPath = path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else {
            throw URLError(.badURL)
        }
        guard let url = URL(string: "\(root)/storage/v1/object/\(bucket)/\(encodedPath)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = data
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue("true", forHTTPHeaderField: "x-upsert")

        let (respData, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: respData, encoding: .utf8) ?? "No response body"
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SupabaseError.badStatus(code, body)
        }
    }

    private func authRequest<T: Decodable>(url: URL, method: String, jsonBody: [String: Any]) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "No response body"
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SupabaseError.badStatus(code, body)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

private struct PricingRow: Decodable {
    let title: String
    let price: String
    let priceSubtitle: String?
    let features: [String]
    let ctaLabel: String?
    let ctaAmount: Double?

    enum CodingKeys: String, CodingKey {
        case title
        case price
        case priceSubtitle = "price_subtitle"
        case features
        case ctaLabel = "cta_label"
        case ctaAmount = "cta_amount"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decode(String.self, forKey: .title)
        price = try container.decode(String.self, forKey: .price)
        priceSubtitle = try container.decodeIfPresent(String.self, forKey: .priceSubtitle)
        ctaLabel = try container.decodeIfPresent(String.self, forKey: .ctaLabel)
        if let numeric = try container.decodeIfPresent(Double.self, forKey: .ctaAmount) {
            ctaAmount = numeric
        } else if let intNumeric = try container.decodeIfPresent(Int.self, forKey: .ctaAmount) {
            ctaAmount = Double(intNumeric)
        } else if let text = try container.decodeIfPresent(String.self, forKey: .ctaAmount) {
            ctaAmount = Double(text)
        } else {
            ctaAmount = nil
        }

        if let arrayFeatures = try container.decodeIfPresent([String].self, forKey: .features) {
            features = arrayFeatures
        } else if let textFeatures = try container.decodeIfPresent(String.self, forKey: .features) {
            features = textFeatures.split(separator: "\n").map { String($0) }
        } else {
            features = []
        }
    }
}

private struct ReviewRow: Decodable {
    let name: String?
    let comment: String?
    let rating: Double?
}

private struct WhyCardRow: Decodable {
    let title: String
    let body: String
}

private struct QuoteRow: Decodable {
    let quote: String
    let author: String
}

private struct ConversationCreateRow: Decodable {
    let id: String
}

private struct ConversationRow: Decodable {
    let id: String
    let status: String?
    let customerName: String?
    let lastMessageAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case status
        case customerName = "customer_name"
        case lastMessageAt = "last_message_at"
    }
}

private struct ConversationMessageRow: Decodable {
    let id: String
    let sender: String?
    let body: String?
    let senderRole: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case sender
        case body
        case senderRole = "sender_role"
        case createdAt = "created_at"
    }
}

private struct SessionRow: Decodable {
    let id: String
}

private struct SessionDetailsRow: Decodable {
    let id: String
    let status: String?
    let details: String?
    let contact: String?
    let scheduledFor: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case status
        case details
        case contact
        case scheduledFor = "scheduled_for"
        case createdAt = "created_at"
    }
}

private struct OrderRow: Decodable {
    let id: String
}

private struct AnnouncementRow: Decodable {
    let id: String
}

private struct AuthResponse: Decodable {
    let accessToken: String?
    let user: AuthUserRow?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case user
    }
}

private struct AuthUserRow: Decodable {
    let id: String
    let email: String?
}

private struct FlickRow: Decodable {
    let id: String
    let caption: String?
    let videoPath: String
    let authorName: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case caption
        case videoPath = "video_path"
        case authorName = "author_name"
        case createdAt = "created_at"
    }
}

private struct FlickLikeRow: Decodable {
    let id: String
}

private struct FlickCommentRow: Decodable {
    let id: String
    let authorName: String?
    let body: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case authorName = "author_name"
        case body
        case createdAt = "created_at"
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
