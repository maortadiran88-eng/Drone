// ErrorBoundary — מונע "מסך לבן" אם רכיב כלשהו קורס; מציג הודעה ברורה ומאפשר המשך.
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = {err:null}; }
  static getDerivedStateFromError(err){ return {err}; }
  componentDidCatch(err, info){ try{ console.error('[ErrorBoundary]', err, info && info.componentStack); }catch(e){} }
  render(){
    if(!this.state.err) return this.props.children;
    const msg = String((this.state.err && this.state.err.message) || this.state.err);
    return (
      <div dir="rtl" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'var(--font)',color:'var(--text)'}}>
        <div style={{maxWidth:460,textAlign:'center',background:'var(--card)',border:'1px solid var(--border)',borderRadius:24,padding:'32px 28px',boxShadow:'0 24px 60px -30px var(--shadow2)'}}>
          <div style={{fontSize:42,marginBottom:8}}>🛠️</div>
          <h1 style={{fontFamily:'var(--disp)',fontWeight:400,fontSize:26,marginBottom:8}}>משהו השתבש</h1>
          <p style={{color:'var(--sub)',lineHeight:1.6,marginBottom:18}}>
            האתר נתקל בתקלה לא צפויה. נתוני הקטלוג בשרת לא נפגעו. אפשר לטעון מחדש וליהנות מהמשך עבודה.
          </p>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={()=>location.reload()}>טען מחדש</button>
            <button className="btn btn-secondary" onClick={()=>{ try{ navigator.clipboard.writeText(msg); }catch(e){} }}>העתק פרטי שגיאה</button>
          </div>
          <div style={{marginTop:14,fontSize:11.5,color:'var(--sub)',direction:'ltr',wordBreak:'break-word',opacity:.8}}>{msg}</div>
        </div>
      </div>
    );
  }
}
