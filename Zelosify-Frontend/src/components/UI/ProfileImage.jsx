export default function ProfileImage({ className }) {
  return (
    <div className="relative">
      <img
        src={"/assets/images/blog01.png"}
        alt="Profile"
        className={`rounded-full bg-[#111111] border ${className || ""}`}
      />
    </div>
  );
}
