import React from 'react'
import FormularioLogin from '../components/FormularioLogin'
import Sidebarlogin from '../components/Sidebarlogin'

const Login = () => {
  return (
    <div className='login__layout'>
      <FormularioLogin />
      <Sidebarlogin />
    
    </div>
  )
}

export default Login