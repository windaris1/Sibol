// Global object to store countdown intervals
let countdownIntervals = {};
// Tracks the currently active event ID
let activeEventId = null;

// Loads channel data from channels.json
async function loadChannels() {
    try {
        const response = await fetch('https://liskatv.pages.dev/channels.json');
        const channels = await response.json();
        const liveTvContent = document.querySelector("#live-tv #content");
        console.log("Live TV Content Element:", liveTvContent);
        if (!liveTvContent) throw new Error("Live TV content element not found");
        liveTvContent.innerHTML = '';
        channels.forEach(channel => {
            const channelHtml = `
                <div class="channel-circle" data-id="${channel.id}" data-url="${channel.url}" title="${channel.name}">
                    <img src="${channel.logo}" alt="${channel.name}" onerror="this.src='https://placehold.co/100x100/ffffff/000000?text=Logo'">
                </div>
            `;
            liveTvContent.insertAdjacentHTML('beforeend', channelHtml);
        });
        liveTvContent.insertAdjacentHTML('beforeend', '<div class="spacer"></div>');
        setupChannels();
    } catch (error) {
        console.error("Error loading channels:", error);
    }
}

// Checks if event has ended based on match_date, match_time, and duration
function isEventEnded(event) {
    const matchDateTime = parseEventDateTime(event.match_date, event.match_time);
    const duration = parseFloat(event.duration) || 3.5;
    const durationMs = duration * 60 * 60 * 1000;
    const endTime = new Date(matchDateTime.getTime() + durationMs);
    const now = new Date();
    return now >= endTime;
}

// Loads event data from event.json
async function loadEvents() {
    try {
        const response = await fetch('skod.json');
        const events = await response.json();
        const liveEventContent = document.querySelector("#live-event #content");
        console.log("Live Event Content Element:", liveEventContent);
        if (!liveEventContent) throw new Error("Live event content element not found");
        console.log("Events:", events);
        liveEventContent.innerHTML = '';

        const validEvents = events.filter(event => {
            const ended = isEventEnded(event);
            if (ended) {
                console.log(`Event ${event.id} has ended and will not be rendered`);
                sessionStorage.setItem(`eventStatus_${event.id}`, 'ended');
            }
            return!ended;
        });

        if (validEvents.length === 0) {
            liveEventContent.innerHTML = `
                <div class="no-events-message">
                    <div class="message-icon">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <h3>No Schedule Available</h3>
                    <p>Please refresh the page to check for updates.</p>
                    <button id="refresh-button" class="refresh-button">
                        <i class="fas fa-sync-alt"></i> Refresh Page
                    </button>
                </div>
            `;
            
            document.getElementById('refresh-button')?.addEventListener('click', () => {
                location.reload();
            });
            return;
        }

        const sortedEvents = validEvents.slice().sort((a, b) => {
            const dateTimeA = parseEventDateTime(a.match_date, a.match_time);
            const dateTimeB = parseEventDateTime(b.match_date, b.match_time);
            return dateTimeA.getTime() - dateTimeB.getTime();
        });

        sortedEvents.forEach(event => {
            const validServers = event.servers.filter(server => server.url && server.label && server.label.trim()!== '');
            const defaultServerUrl = validServers[0]?.url || '';
            const serverListJson = encodeURIComponent(JSON.stringify(validServers));

            const eventHtml = `
                <div class="event-container" data-id="${event.id}" data-url="${defaultServerUrl}" data-servers="${serverListJson}" data-duration="${event.duration}">
                    <div class="event-header">
                        <div class="league-info">
                            <img src="${event.icon}" class="sport-icon" onerror="this.src='https://placehold.co/30x30/png?text=Icon';">
                            <span class="league-name">${event.league}</span>
                        </div>
                        <button class="copy-url-button" data-id="/?${event.id}" title="Copy event URL">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                    <div class="event-details">
                        <div class="team-left">
                            <img src="${event.team1.logo}" class="team-logo" alt="${event.team1.name}" onerror="this.src='https://placehold.co/50x50/png?text=Team';">
                            <span class="team-name">${event.team1.name}</span>
                        </div>
                        <div class="match-info">
                            <div class="kickoff-match-date">${event.kickoff_date}</div>
                            <div class="kickoff-match-time">${event.kickoff_time}</div>

<div class="flex items-center gap-2">
  <span class="relative flex h-2 w-2">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
    <span class="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
  </span>
  <span class="text-[#e4e6eb] text-sm">LIVE</span>
</div>

                            <div class="match-date" data-original-date="${event.match_date}" style="display:none;">${event.match_date}</div>
                            <div class="match-time" data-original-time="${event.match_time}" style="display:none;">${event.match_time}</div>
                        </div>
                        <div class="team-right">
                            <img src="${event.team2.logo}" class="team-logo" alt="${event.team2.name}" onerror="this.src='https://placehold.co/50x50/png?text=Team';">
                            <span class="team-name">${event.team2.name}</span>
                        </div>
                    </div>
                    <div class="server-buttons" style="display:none;">
                        <div class="buttons-container"></div>
                    </div>
                </div>
            `;
            liveEventContent.insertAdjacentHTML('beforeend', eventHtml);
            console.log(`Event Created: ${event.id}`);

            const eventContainer = liveEventContent.querySelector(`.event-container[data-id="${event.id}"]`);
            const buttonsContainer = eventContainer.querySelector('.buttons-container');
            if (!buttonsContainer) {
                console.error(`Buttons container not found for event ${event.id}`);
                return;
            }
            validServers.forEach((server, index) => {
                const button = document.createElement('div');
                button.className = 'server-button';
                if (index === 0) button.classList.add('active');
                button.setAttribute('data-url', server.url);
                button.textContent = server.label;
                buttonsContainer.appendChild(button);
                console.log(`Server button created for ${event.id}: ${server.label} (${server.url})`);
            });
        });

        liveEventContent.insertAdjacentHTML('beforeend', '<div class="spacer"></div>');
        setupEvents();
        setupCopyButtons();

        const savedEventId = sessionStorage.getItem('activeEventId');
        const savedServerUrl = sessionStorage.getItem(`activeServerUrl_${savedEventId}`);
        if (savedEventId && savedServerUrl) {
            const eventContainer = document.querySelector(`.event-container[data-id="${savedEventId}"]`);
            if (eventContainer) {
                const serverButton = eventContainer.querySelector(`.server-button[data-url="${savedServerUrl}"]`);
                if (serverButton) selectServerButton(serverButton);
                loadEventVideo(eventContainer, savedServerUrl, false);
                const matchDate = eventContainer.querySelector('.match-date')?.getAttribute('data-original-date');
                const matchTime = eventContainer.querySelector('.match-time')?.getAttribute('data-original-time');
                const matchDateTime = parseEventDateTime(matchDate, matchTime);
                if (new Date() >= matchDateTime) {
                    toggleServerButtons(eventContainer, true);
                    console.log(`Restored server buttons for saved event ${savedEventId}`);
                }
            }
        }

        const path = window.location.pathname;
        const eventIdFromUrl = path.replace(/^\/+/, '');
        console.log("Event ID from URL:", eventIdFromUrl);
        if (eventIdFromUrl) {
            const eventContainer = document.querySelector(`.event-container[data-id="${eventIdFromUrl}"]`);
            if (eventContainer) {
                const savedServerUrl = sessionStorage.getItem(`activeServerUrl_${eventIdFromUrl}`);
                const defaultServerUrl = eventContainer.getAttribute('data-url');
                const videoUrl = savedServerUrl || defaultServerUrl;
                const serverButton = eventContainer.querySelector(`.server-button[data-url="${videoUrl}"]`);
                if (serverButton) selectServerButton(serverButton);
                loadEventVideo(eventContainer, videoUrl, false);
                const matchDate = eventContainer.querySelector('.match-date')?.getAttribute('data-original-date');
                const matchTime = eventContainer.querySelector('.match-time')?.getAttribute('data-original-time');
                const matchDateTime = parseEventDateTime(matchDate, matchTime);
                if (new Date() >= matchDateTime) {
                    toggleServerButtons(eventContainer, true);
                    console.log(`Showing server buttons for URL-loaded event ${eventIdFromUrl}`);
                }
                sessionStorage.setItem('activeEventId', eventIdFromUrl);
                sessionStorage.removeItem('activeChannelId');
                setActiveHoverEffect(eventIdFromUrl);
                switchContent('live-event');
            } else {
                console.warn(`No event found for ID: ${eventIdFromUrl}`);
            }
        }
    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// Sets up event listeners for copy buttons
function setupCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-url-button');
    console.log("Copy Buttons Found:", copyButtons.length);
    copyButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const eventId = button.getAttribute('data-id');