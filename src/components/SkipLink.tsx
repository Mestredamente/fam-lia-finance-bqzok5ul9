export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault()
        const main = document.getElementById('main-content')
        if (main) {
          main.focus()
          main.scrollIntoView()
        }
      }}
    >
      Pular para o conteúdo principal
    </a>
  )
}
