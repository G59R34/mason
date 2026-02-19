import Foundation
import Combine
import SwiftUI

struct ContentView: View {
    @StateObject private var store = MasonDataStore()
    @State private var selectedTab: AppTab = .home
    @State private var isAccountPresented = false

    var body: some View {
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
        .environmentObject(store)
        .tint(MasonTheme.primary)
        .sheet(isPresented: $isAccountPresented) {
            AccountView(selectedTab: $selectedTab, isPresented: $isAccountPresented)
        }
        .task {
            await store.loadIfNeeded()
        }
    }
}

private enum AppTab: Hashable {
    case home
    case pricing
    case why
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
            .navigationTitle("Mason")
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

    @State private var name: String = ""
    @State private var contact: String = ""
    @State private var details: String = ""
    @State private var location: String = ""
    @State private var durationMinutes: String = "60"
    @State private var scheduledFor: Date = .now.addingTimeInterval(3600)
    @State private var isSubmitting = false
    @State private var errorMessage: String?

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
            let sessionID = try await client.createSessionBooking(request: request)
            storedCustomerName = trimmedName
            onBooked("Booking confirmed. Session ID: \(sessionID)")
            dismiss()
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
    @State private var activeConversationID: String?
    @State private var activeConversationStatus: String = "open"
    @State private var tickets: [ConversationSummary] = []
    @State private var ticketIDs: [String] = []
    @State private var messages: [ChatMessage] = []
    @State private var newMessage: String = ""
    @State private var chatError: String?
    @State private var isBusy = false
    @State private var hasInitialized = false

    private let pollTimer = Timer.publish(every: 4, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
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
                        Text("Saved tickets")
                            .font(.title3.bold())
                            .foregroundStyle(MasonTheme.textPrimary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(tickets) { ticket in
                                    Button {
                                        Task { await openConversation(id: ticket.id) }
                                    } label: {
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text("Ticket \(ticket.id.prefix(8))")
                                                .font(.subheadline.weight(.semibold))
                                            Text(ticket.status.uppercased())
                                                .font(.caption)
                                        }
                                        .foregroundStyle(ticket.id == activeConversationID ? .white : MasonTheme.textPrimary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 8)
                                        .background(ticket.id == activeConversationID ? MasonTheme.primary : Color.black.opacity(0.06))
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }

                if let activeConversationID {
                    Card {
                        HStack {
                            Text("Active: \(activeConversationID)")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(MasonTheme.textPrimary)
                            Spacer()
                            Text(activeConversationStatus.uppercased())
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(activeConversationStatus == "closed" ? .red : MasonTheme.primary)
                        }

                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 8) {
                                if messages.isEmpty {
                                    Text("No messages yet.")
                                        .foregroundStyle(MasonTheme.textSecondary)
                                }
                                ForEach(messages) { message in
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(message.sender)
                                                .font(.subheadline.weight(.semibold))
                                            Spacer()
                                            Text(message.prettyDate)
                                                .font(.caption)
                                                .foregroundStyle(MasonTheme.textSecondary)
                                        }
                                        Text(message.body)
                                            .foregroundStyle(MasonTheme.textPrimary)
                                        if let role = message.senderRole, !role.isEmpty {
                                            Text(role.uppercased())
                                                .font(.caption2)
                                                .foregroundStyle(MasonTheme.textSecondary)
                                        }
                                    }
                                    .padding(10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.black.opacity(0.04))
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                            }
                        }
                        .frame(maxHeight: 280)

                        TextField(activeConversationStatus == "closed" ? "This ticket is closed" : "Type a message...", text: $newMessage, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...5)
                            .disabled(activeConversationStatus == "closed")

                        HStack {
                            Button {
                                Task { await sendMessageToActiveTicket() }
                            } label: {
                                Label("Send", systemImage: "arrow.up.circle.fill")
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(MasonTheme.primary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                            .disabled(isBusy || activeConversationStatus == "closed" || newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                            Spacer()

                            Button {
                                Task { await refreshActiveConversation() }
                            } label: {
                                Label("Refresh", systemImage: "arrow.clockwise")
                                    .font(.subheadline.weight(.semibold))
                            }
                            .buttonStyle(.plain)
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
                if !storedConversationID.isEmpty {
                    await openConversation(id: storedConversationID)
                }
            }
            .onReceive(pollTimer) { _ in
                Task { await refreshActiveConversation() }
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
            await openConversation(id: id)
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
        await openConversation(id: id)
    }

    private func openConversation(id: String) async {
        guard let client = SupabaseRESTClient.fromBundle() else {
            chatError = "Supabase is not configured."
            return
        }
        isBusy = true
        defer { isBusy = false }

        do {
            if let convo = try await client.fetchConversation(conversationID: id) {
                activeConversationID = convo.id
                activeConversationStatus = convo.status
                storedConversationID = convo.id
                resumeConversationID = convo.id
                messages = try await client.fetchMessages(conversationID: convo.id)
                chatError = nil
            } else {
                chatError = "Conversation not found."
            }
        } catch {
            chatError = "Could not open conversation: \(error.localizedDescription)"
        }
    }

    private func refreshActiveConversation() async {
        guard let id = activeConversationID, let client = SupabaseRESTClient.fromBundle() else { return }
        do {
            if let convo = try await client.fetchConversation(conversationID: id) {
                activeConversationStatus = convo.status
            }
            messages = try await client.fetchMessages(conversationID: id)
            chatError = nil
        } catch {
            chatError = "Refresh failed: \(error.localizedDescription)"
        }
    }

    private func sendMessageToActiveTicket() async {
        guard let id = activeConversationID else { return }
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedMessage = newMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty, !trimmedMessage.isEmpty else { return }
        guard let client = SupabaseRESTClient.fromBundle() else {
            chatError = "Supabase is not configured."
            return
        }
        guard activeConversationStatus != "closed" else {
            chatError = "This conversation is closed."
            return
        }

        isBusy = true
        defer { isBusy = false }
        do {
            try await client.sendMessage(conversationID: id, sender: trimmedName, body: trimmedMessage, senderRole: "user")
            try await client.touchConversation(conversationID: id)
            newMessage = ""
            storedName = trimmedName
            messages = try await client.fetchMessages(conversationID: id)
            chatError = nil
        } catch {
            chatError = "Send failed: \(error.localizedDescription)"
        }
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

private struct AccountView: View {
    @Binding var selectedTab: AppTab
    @Binding var isPresented: Bool
    @AppStorage("ms_customer_name") private var customerName: String = ""
    @State private var email: String = ""

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
                            Text("Profile, booking shortcuts, and support")
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
            }
            .navigationTitle("Account")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { isPresented = false }
                }
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

    static let samples: [PricingPlan] = [
        PricingPlan(
            title: "Basic",
            price: "$2.50",
            subtitle: "Per session",
            features: ["Will slap it around a bit", "No bust is included"],
            cta: "Book Basic"
        ),
        PricingPlan(
            title: "The 'Happy Ending' Special",
            price: "$5",
            subtitle: "Per stroke",
            features: ["Mason will get it done QUICK!", "Max 10 strokes"],
            cta: "Book Happy Ending"
        ),
        PricingPlan(
            title: "The 'Finishing' Move",
            price: "$100",
            subtitle: "Custom",
            features: ["Priority scheduling", "Full stroke experience", "Guaranteed bust"],
            cta: "Book Finishing Move"
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
            select: "title,price,price_subtitle,features,cta_label",
            queryItems: [URLQueryItem(name: "order", value: "sort_order.asc")]
        )

        return rows.map {
            PricingPlan(
                title: $0.title,
                price: $0.price,
                subtitle: $0.priceSubtitle ?? "",
                features: $0.features,
                cta: $0.ctaLabel ?? "Book"
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
}

private struct PricingRow: Decodable {
    let title: String
    let price: String
    let priceSubtitle: String?
    let features: [String]
    let ctaLabel: String?

    enum CodingKeys: String, CodingKey {
        case title
        case price
        case priceSubtitle = "price_subtitle"
        case features
        case ctaLabel = "cta_label"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decode(String.self, forKey: .title)
        price = try container.decode(String.self, forKey: .price)
        priceSubtitle = try container.decodeIfPresent(String.self, forKey: .priceSubtitle)
        ctaLabel = try container.decodeIfPresent(String.self, forKey: .ctaLabel)

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

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
