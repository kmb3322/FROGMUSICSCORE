import { Link } from 'react-router-dom'

// 로고 줄: 가로 전체가 메인으로 가는 링크, 마우스를 올리면 초록 띠
export default function LogoRow({ onClick }) {
  return (
    <h1 className="logo-row">
      <Link to="/" onClick={onClick}>
        FROG
        <br />
        MUSIC SCORE
        <br />
        KOREA
      </Link>
    </h1>
  )
}
