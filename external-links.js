// Opens every external link (a different host than this site) in a new tab.
// Internal navigation (nav, home, "Read More", etc.) is left untouched since
// its href resolves to the same hostname. Runs once on load, so it also
// covers links inside blog post content without editing every post.
document.addEventListener("DOMContentLoaded", function () {
  var here = window.location.hostname;

  document.querySelectorAll("a[href]").forEach(function (link) {
    var href = link.getAttribute("href");

    if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) {
      return;
    }

    if (link.hostname && link.hostname !== here) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
});
