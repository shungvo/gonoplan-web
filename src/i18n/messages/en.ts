import type { Message } from './keys';

/**
 * The English catalogue, and the one that defines the key set.
 *
 * Keys read `area.thing`, and the two catalogues are kept in the same order so
 * that reviewing a change means reading the same line number in both. A
 * missing Vietnamese string is a type error rather than an English word
 * appearing mid-sentence on a Vietnamese screen.
 *
 * Plural entries are objects. `Intl.PluralRules` picks the form, so nothing
 * here encodes grammar — `#` inside a form is the count.
 */
export const en = {
  // ─── Common ───────────────────────────────────────────────────────────────
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.remove': 'Remove',
  'common.close': 'Close',
  'common.back': 'Go back',
  'common.retry': 'Try again',
  'common.loading': 'Loading',
  'common.optional': '(optional)',
  'common.somethingWrong': 'Something went wrong.',
  'common.offline': 'Could not reach Gonoplan. Check your connection.',
  'common.signIn': 'Sign in',
  'common.seeAll': 'See all',
  'common.apply': 'Apply',
  'common.clear': 'Clear',
  'common.reset': 'Reset',
  'common.done': 'Done',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.submit': 'Submit',
  'common.confirm': 'Confirm',
  'common.preview': 'Preview',

  // ─── Navigation ───────────────────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.saved': 'Saved',
  'nav.profile': 'Profile',
  'nav.main': 'Main',

  // ─── Language ─────────────────────────────────────────────────────────────
  'language.title': 'Language',
  'language.description': 'Applies everywhere, and follows your account to other devices.',

  // ─── Page titles ──────────────────────────────────────────────────────────
  'meta.saved': 'Saved',
  'meta.profile': 'Profile',
  'meta.explore': 'Explore',
  'meta.search': 'Search',
  'meta.owner': 'Your business',
  'meta.addPlace': 'Add a place',
  'meta.addPlaceDescription':
    'Suggest somewhere worth going. Every submission is reviewed before it appears.',
  'meta.admin': 'Admin',
  'meta.appDescription': 'Discover where to go, eat and stay — wherever you are.',
  'meta.placeFallback': 'Place',
  'meta.placeFallbackDescription': 'Discover places on Gonoplan.',
  'meta.placeDescription': '{category} in {area}. Discover it on Gonoplan.',
  'manifest.name': 'Gonoplan — discover where to go',

  // ─── Home ─────────────────────────────────────────────────────────────────
  'home.searchPlaceholder': 'Where do you want to go?',
  'home.signedInAs': 'Signed in as {name}',
  'home.categories': 'Categories',
  'home.map': 'Map',
  'home.onTheMap': 'On the map',
  'home.viewAll': 'View all',
  'home.withinRadius': 'within {distance}',
  'home.nothingOpen': 'Everything nearby is closed at the moment.',
  'home.showingAround': 'Showing places around {label}',

  // Rail headings. Taken from the collection's stable `key` rather than the
  // server's prose, for the same reason the client switches on an error code:
  // the wire carries an identifier, the screen carries the language.
  'collection.popular-near-you.title': 'Popular near you',
  'collection.popular-near-you.subtitle': 'Where people are actually going',
  'collection.best-rated.title': 'Best rated',
  'collection.best-rated.subtitle': 'Consistently good, not just once',
  'collection.hidden-gems.title': 'Hidden gems',
  'collection.hidden-gems.subtitle': 'Well liked, not yet crowded',
  'collection.good-for-tonight.title': 'Good for tonight',
  'collection.good-for-tonight.subtitle': 'Open now, close by',
  'collection.recommended-for-you.title': 'Recommended for you',
  'collection.recommended-for-you.subtitle': 'Based on what you keep going back to',

  // ─── Places ───────────────────────────────────────────────────────────────
  'place.openNow': 'Open',
  'place.new': 'New',
  'place.nothingYet': 'Nothing here yet.',
  'place.gone': 'This place is no longer available',
  'place.loadFailed': 'Could not load this place',
  'place.checkConnection': 'Check your connection and try again.',
  'place.reviewCount': { one: '{count} review', other: '{count} reviews' },

  // ─── Saved ────────────────────────────────────────────────────────────────
  'saved.title': 'Saved',
  'saved.count': { one: '{count} place you want to visit', other: '{count} places you want to visit' },
  'saved.signedOutTitle': 'Sign in to keep your places',
  'saved.signedOutDescription':
    'Saved places sync across your devices, so a shortlist made on the bus is still there at dinner.',
  'saved.emptyTitle': 'Nothing saved yet',
  'saved.emptyDescription': 'Tap the bookmark on any place to keep it here.',
  'saved.explore': 'Explore places',
  'saved.add': 'Save this place',
  'saved.removeAction': 'Remove from saved',
  'saved.saved': 'Saved',
  'saved.save': 'Save',

  // ─── Location ─────────────────────────────────────────────────────────────
  'location.myLocation': 'My location',
  'location.finding': 'Finding you…',
  'location.locating': 'Locating…',
  'location.choose': 'Choose your location',
  'location.lastKnown': '{coordinates} (last known)',

  // ─── Search ───────────────────────────────────────────────────────────────
  'search.label': 'Search',
  'search.placeholder': 'Places, categories, cities',
  'search.clear': 'Clear search',
  'search.recent': 'Recent',
  'search.recentSearches': 'Recent searches',
  'search.removeRecent': 'Remove {query} from recent searches',
  'search.popular': 'Popular right now',
  'search.popularSearches': 'Popular searches',
  'search.browseCategory': 'Browse by category',
  'search.cities': 'Cities',
  'search.goToCity': 'Go to city',
  'search.browseIn': 'Browse places in {city}',
  'search.results': 'Search results',
  'search.resultCount': { one: '{count} place', other: '{count} places' },
  'search.placeCount': { one: '{count} place', other: '{count} places' },
  'search.nothingFound': 'Nothing found for “{query}”',
  'search.nothingFoundHint': 'Try a shorter word, a category like “cafe”, or a different city.',

  // ─── Auth ─────────────────────────────────────────────────────────────────
  'auth.createTitle': 'Create your account',
  'auth.welcomeBack': 'Welcome back',
  'auth.pitch': 'Save places, write reviews, and get recommendations tuned to you.',
  'auth.name': 'Name',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordHint': 'At least 8 characters.',
  'auth.createAccount': 'Create account',
  'auth.haveAccount': 'Already have an account?',
  'auth.newHere': 'New here?',
  'auth.createOne': 'Create an account',
  'auth.failed': 'Something went wrong. Please try again.',

  // ─── City picker ──────────────────────────────────────────────────────────
  'city.title': 'Choose your location',
  'city.deniedDescription':
    'Location is turned off for Gonoplan. Pick a city and everything still works.',
  'city.unavailableDescription':
    'We could not find you automatically. Pick a city to start exploring.',
  'city.retry': 'Try using my location again',
  'city.searchPlaceholder': 'Search a city',
  'city.noMatch': 'No city matches “{query}”.',

  // ─── Place detail ─────────────────────────────────────────────────────────
  'detail.typical': 'typical',
  'detail.getDirections': 'Get directions',
  'detail.directions': 'Directions',
  'detail.share': 'Share this place',
  'detail.openFullPage': 'Open full page',
  'detail.call': 'Call',
  'detail.website': 'Website',
  'detail.about': 'About',
  'detail.readMore': 'Read more',
  'detail.showLess': 'Show less',
  'detail.photos': 'Photos',
  'detail.reportListing': 'Report a problem with this listing',
  'detail.signInToSave': 'Sign in to save places and come back to them later.',

  // ─── Opening hours ────────────────────────────────────────────────────────
  'hours.notListed': 'Opening hours not listed yet',
  'hours.openNow': 'Open now',
  'hours.closed': 'Closed',
  'hours.open24': 'Open 24 hours',

  // ─── Getting there ────────────────────────────────────────────────────────
  'route.title': 'Getting there',
  'route.travelMode': 'Travel mode',
  'route.drive': 'Drive',
  'route.cycle': 'Cycle',
  'route.walk': 'Walk',
  'route.openInMapsFor': 'Open directions to {name} in Google Maps',
  'route.blocked':
    'Location is blocked, so we cannot measure the trip from where you are. You can still open directions in Maps.',
  'route.shareLocation': 'Share your location to see how long it takes to get here.',
  'route.useMyLocation': 'Use my location',
  'route.finding': 'Finding a route…',
  'route.none': 'No route we can measure — Maps may still have one.',
  'route.estimated': 'estimated',
  'route.openInMaps': 'Open in Maps',

  // ─── Photos ───────────────────────────────────────────────────────────────
  'photos.none': 'No photos yet',
  'photos.previous': 'Previous photo',
  'photos.next': 'Next photo',

  // ─── Card stack ───────────────────────────────────────────────────────────
  'stack.cardLabel':
    '{name}. Recommendation {position} of {total}. Use the left and right arrow keys to browse.',

  // ─── Explore ──────────────────────────────────────────────────────────────
  'explore.title': 'Explore',
  'explore.fullMap': 'Full map',
  'explore.searchPlaces': 'Search places',
  'explore.searchAround': 'Search around {label}',
  'explore.list': 'List',
  'explore.openNow': 'Open now',
  'explore.clearRoute': 'Clear route',
  'explore.noRouteTo': 'No route to {name}',
  'explore.distanceTo': '{distance} to {name}',
  'explore.showRouteTo': 'Show the route to {name}',
  'explore.nothingInView': 'Nothing loaded in this area — try moving the map back, or widen your filters.',
  'explore.loadFailed': 'Could not load places',
  'explore.serverProblem': 'Something went wrong at our end. Try again in a moment.',
  'explore.noMatches': 'Nothing matches your filters',
  'explore.noMatchesHint': 'Try removing a filter or widening your search.',
  'explore.emptyArea': 'Nothing around here yet',
  'explore.emptyAreaHint':
    'Gonoplan is still filling in this area. Try another city from the location picker.',
  'explore.clearFilters': 'Clear filters',
  'explore.resultCount': { one: '{count} place', other: '{count} places' },
  'explore.withinRadius': 'within {distance}',

  // ─── Server-originated messages ───────────────────────────────────────────
  //
  // The API returns English prose in `message`, and `errorCodes.ts` states
  // plainly that a client must switch on `code` instead. These are that
  // switch. Anything unmapped falls back to the server's own wording, which is
  // wrong-language but never blank.
  'error.AUTH_REQUIRED': 'Sign in to continue',
  'error.AUTH_INVALID_CREDENTIALS': 'That email and password do not match',
  'error.AUTH_TOKEN_EXPIRED': 'Your session expired — sign in again',
  'error.AUTH_EMAIL_TAKEN': 'An account with that email already exists',
  'error.AUTH_ACCOUNT_SUSPENDED': 'This account has been suspended',
  'error.AUTH_FORBIDDEN': 'You do not have permission to do that',
  'error.VALIDATION_FAILED': 'Some of that could not be accepted — check the fields above',
  'error.PLACE_NOT_FOUND': 'That place could not be found',
  'error.PLACE_NOT_APPROVED': 'This place is not available yet',
  'error.PLACE_ALREADY_EXISTS': 'A place like that already exists here',
  'error.PLACE_EDIT_FORBIDDEN': 'You cannot edit this place',
  'error.REVIEW_NOT_FOUND': 'That review could not be found',
  'error.REVIEW_ALREADY_EXISTS': 'You have already reviewed this place',
  'error.REVIEW_OWN_PLACE_FORBIDDEN': 'You cannot review your own business',
  'error.REVIEW_EDIT_WINDOW_EXPIRED': 'Reviews can only be edited for 24 hours',
  'error.OWNER_NOT_APPROVED': 'Your business is still being reviewed',
  'error.REPORT_SELF_FORBIDDEN': 'You cannot report your own content',
  'error.REPORT_ALREADY_HANDLED': 'This report has already been handled',
  'error.UPLOAD_INVALID_TYPE': 'That file type is not supported',
  'error.UPLOAD_TOO_LARGE': 'That photo is too large',
  'error.UPLOAD_VERIFICATION_FAILED': 'That photo could not be verified',
  'error.ROUTE_NOT_FOUND': 'No route between those two points',
  'error.ADDRESS_NOT_FOUND': 'No address at that point',
  'error.RATE_LIMIT_EXCEEDED': 'Too many requests — please slow down',
  'error.PROVIDER_UNAVAILABLE': 'That service is unavailable right now',
  'error.SERVICE_UNAVAILABLE': 'That service is unavailable right now',
  'error.NETWORK_ERROR': 'Could not reach Gonoplan. Check your connection.',
  'error.INTERNAL_ERROR': 'Something went wrong at our end',

  // ─── Reviews ──────────────────────────────────────────────────────────────
  'reviews.title': 'Reviews',
  'reviews.write': 'Write a review',
  'reviews.none': 'No reviews yet — be the first to write one.',
  'reviews.showingFirst': { one: 'Showing the first review', other: 'Showing the first {count} reviews' },
  'reviews.sortHelpful': 'Most helpful',
  'reviews.sortRecent': 'Newest',
  'reviews.sortHigh': 'Highest',
  'reviews.sortLow': 'Lowest',
  'reviews.you': 'You',
  'reviews.ratingOutOf': '{rating} out of 5',
  'reviews.helpful': 'Helpful',
  'reviews.owner': 'owner',
  'reviews.photoAlt': "Photo {position} from {name}'s review",
  'reviews.today': 'Today',
  'reviews.yesterday': 'Yesterday',

  // ─── Write a review ───────────────────────────────────────────────────────
  'write.editTitle': 'Edit your review',
  'write.newTitle': 'Rate this place',
  'write.tellMore': 'Tell people more',
  'write.contentPlaceholder': 'What stood out? Anything worth knowing before going?',
  'write.photos': 'Photos',
  'write.saveFailed': 'Could not save your review.',
  'write.saveChanges': 'Save changes',
  'write.post': 'Post review',
  'write.editWindow': 'Reviews can be edited for 24 hours after posting.',
  'write.publicNotice': 'Your review is public and shows your name.',

  // ─── Report ───────────────────────────────────────────────────────────────
  'report.title': 'Report this place',
  'report.reason': 'Reason',
  'report.details': 'Details',
  'report.required': '(required)',
  'report.detailsPlaceholder': 'What did you see? Anything specific helps.',
  'report.send': 'Send report',
  'report.privacy': 'Your name is never shown publicly. Only moderators see who reported a place.',
  'report.failed': 'Could not send your report. Try again in a moment.',
  'report.alreadyTitle': 'Already with our team',
  'report.alreadyBody': 'You have already reported this place and we are still looking at it.',
  'report.thanksTitle': 'Thanks for telling us',
  'report.thanksBody': 'Someone will review this listing. We do not share who reported it.',
  'report.CLOSED_PERMANENTLY': 'Permanently closed',
  'report.CLOSED_PERMANENTLY.hint': 'It has shut down for good',
  'report.INCORRECT_INFO': 'Wrong information',
  'report.INCORRECT_INFO.hint': 'Address, hours or phone are wrong',
  'report.DUPLICATE': 'Duplicate listing',
  'report.DUPLICATE.hint': 'This place is already on Gonoplan',
  'report.SPAM': 'Spam or fake',
  'report.SPAM.hint': 'It is advertising, or does not exist',
  'report.INAPPROPRIATE': 'Inappropriate',
  'report.INAPPROPRIATE.hint': 'Offensive content or images',
  'report.OTHER': 'Something else',
  'report.OTHER.hint': 'Tell us what is wrong',

  // ─── Photo picker ─────────────────────────────────────────────────────────
  'picker.photoAlt': 'Photo {position}',
  'picker.removePhoto': 'Remove photo {position}',
  'picker.uploading': 'Uploading photo',
  'picker.add': 'Add photo',
  'picker.failed': 'That photo could not be uploaded.',

  // ─── Add a place ──────────────────────────────────────────────────────────
  'submit.signInTitle': 'Sign in to add a place',
  'submit.signInBody': 'Submissions are credited to your account, and we may need to ask you about them.',
  'submit.goToSignIn': 'Go to sign in',
  'submit.doneTitle': 'Submitted for review',
  'submit.doneBody':
    'A moderator will check {name} before it appears. You will find it under your profile in the meantime.',
  'submit.backToExplore': 'Back to Explore',
  'submit.addAnother': 'Add another',
  'submit.title': 'Add a place',
  'submit.intro': 'Everything here is checked by a moderator before it goes live.',
  'submit.name': 'Name',
  'submit.namePlaceholder': 'The Workshop Coffee',
  'submit.category': 'Category',
  'submit.description': 'Description',
  'submit.descriptionHint': 'Bold, headings and lists are supported. Say what makes it worth going.',
  'submit.descriptionPlaceholder':
    'Small roaster on a quiet lane.\n\n- Single origin, changes weekly\n- Quiet enough to work',
  'submit.photos': 'Photos',
  'submit.photosHint': 'Up to eight. The first becomes the cover.',
  'submit.address': 'Address',
  'submit.addressHint': 'Start typing and pick a match — the pin and the fields below fill themselves.',
  'submit.addressPlaceholder': '27 Ngô Đức Kế, Phường Bến Nghé',
  'submit.province': 'Province / City',
  'submit.district': 'District',
  'submit.districtPlaceholder': 'Quận 1',
  'submit.ward': 'Ward',
  'submit.wardPlaceholder': 'Phường Bến Nghé',
  'submit.pin': 'Pin the exact spot',
  'submit.pinHint': 'Drag the map to move the pin.',
  'submit.useMyLocation': 'Use my location',
  'submit.useThisAddress': 'Use this address',
  'submit.fallbackWarning': 'From the development address service — check it before submitting.',
  'submit.priceRange': 'Price range',
  'submit.phone': 'Phone',
  'submit.phonePlaceholder': '028 3822 1234',
  'submit.website': 'Website',
  'submit.failed': 'Could not submit that. Please try again.',
  'submit.send': 'Submit for review',

  'priceRange.BUDGET': 'Budget',
  'priceRange.MODERATE': 'Moderate',
  'priceRange.EXPENSIVE': 'Expensive',
  'priceRange.LUXURY': 'Luxury',

  // ─── Address autocomplete ─────────────────────────────────────────────────
  'address.suggestions': 'Address suggestions',

  // ─── Rich text editor ─────────────────────────────────────────────────────
  'editor.bold': 'Bold',
  'editor.italic': 'Italic',
  'editor.heading': 'Heading',
  'editor.bulletList': 'Bullet list',
  'editor.numberedList': 'Numbered list',
  'editor.link': 'Link',
  'editor.nothingToPreview': 'Nothing to preview yet.',

  // ─── Owner ────────────────────────────────────────────────────────────────
  'owner.title': 'Your business',
  'owner.signInTitle': 'Sign in to manage a business',
  'owner.signInBody':
    'Claim your place, respond to reviews, and see how many people are finding you.',
  'owner.signInReason': 'Sign in to manage your business on Gonoplan.',
  'owner.counts': '{published} published · {pending} awaiting review',
  'owner.pendingNotice':
    'Your business is awaiting approval. You can still see everything here meanwhile.',
  'owner.views': 'Views',
  'owner.saves': 'Saves',
  'owner.reviews': 'Reviews',
  'owner.places': 'Places',
  'owner.noPlacesTitle': 'No places yet',
  'owner.noPlacesBody': 'Places you submit and claim will appear here with their review status.',
  'owner.revisionPending': 'Your changes are awaiting review',
  'owner.viewCount': { one: '{count} view', other: '{count} views' },
  'owner.saveCount': { one: '{count} save', other: '{count} saves' },
  'owner.reviewCount': { one: '{count} review', other: '{count} reviews' },
  'owner.showLast30': 'Show last 30 days',
  'owner.hideLast30': 'Hide last 30 days',
  'owner.needsReply': 'Needs a reply',
  'owner.all': 'All',
  'owner.allAnswered': 'Everything answered',
  'owner.allAnsweredBody': 'Every review on your places has a reply.',
  'owner.noReviews': 'No reviews yet',
  'owner.noReviewsBody': 'Reviews on your places will appear here.',
  'owner.reply': 'Reply',

  'placeStatus.PENDING': 'awaiting review',
  'placeStatus.APPROVED': 'published',
  'placeStatus.REJECTED': 'rejected',
  'placeStatus.SUSPENDED': 'suspended',
  'placeStatus.DRAFT': 'draft',
  'placeStatus.DELETED': 'deleted',

  // ─── Register a business ──────────────────────────────────────────────────
  'register.title': 'Register your business',
  'register.body':
    'Claim your place, reply to reviews, and see how many people are finding you. An administrator reviews every registration before it goes live.',
  'register.name': 'Business name',
  'register.namePlaceholder': 'Hòa Hospitality Group',
  'register.email': 'Contact email',
  'register.emailPlaceholder': 'contact@yourbusiness.vn',
  'register.phone': 'Phone',
  'register.phonePlaceholder': '+84 28 1234 5678',
  'register.failed': 'Could not register your business.',
  'register.submit': 'Register',

  // ─── Owner reply ──────────────────────────────────────────────────────────
  'reply.title': 'Reply as the business',
  'reply.context': '{place} · {name} left {rating}★',
  'reply.label': 'Your reply',
  'reply.placeholder': 'Thank them, or explain what you have changed.',
  'reply.failed': 'Could not post your reply.',
  'reply.post': 'Post reply',
  'reply.publicNotice': 'Your reply is public and shows your business name.',

  // ─── Place page ───────────────────────────────────────────────────────────
  'page.back': 'Back',
  'page.goneBody': 'It may have been removed, or the link may be out of date.',
  'page.backToApp': 'Back to Gonoplan',

  // ─── Star input ───────────────────────────────────────────────────────────
  'stars.groupLabel': 'Your rating',
  'stars.starLabel': { one: '{count} star — {word}', other: '{count} stars — {word}' },
  'stars.prompt': 'Tap to rate',
  'stars.1': 'Poor',
  'stars.2': 'Fair',
  'stars.3': 'Good',
  'stars.4': 'Great',
  'stars.5': 'Excellent',

  // ─── Map ──────────────────────────────────────────────────────────────────
  'map.unavailable': 'Map unavailable',
  'map.capped': 'Showing the top places — zoom in for more',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',

  // ─── API status ───────────────────────────────────────────────────────────
  'status.checking': 'Checking API…',
  'status.connected': 'API connected',
  'status.unreachable': 'API unreachable',
  'status.proxying': 'Proxying /api/v1 → Express',

  // ─── Profile ──────────────────────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.guestTitle': "You're browsing as a guest",
  'profile.guestDescription':
    'Sign in to save places, write reviews, and get recommendations tuned to you.',
  'profile.signInCta': 'Sign in or create an account',
  'profile.administrator': 'Administrator',
  'profile.businessOwner': 'Business owner',
  'profile.addPlace': 'Add a place',
  'profile.yourBusiness': 'Your business',
  'profile.registerBusiness': 'Register your business',
  'profile.signOut': 'Sign out',

  'ownerStatus.PENDING': 'awaiting review',
  'ownerStatus.APPROVED': 'approved',
  'ownerStatus.REJECTED': 'rejected',
  'ownerStatus.SUSPENDED': 'suspended',
} as const satisfies Record<string, Message>;
