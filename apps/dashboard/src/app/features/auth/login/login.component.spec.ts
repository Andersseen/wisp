import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LoginComponent } from './login.component'
import { AuthService } from '../../../core/auth.service'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'

describe('LoginComponent', () => {
  let component: LoginComponent
  let fixture: ComponentFixture<LoginComponent>
  let authSpy: { login: typeof jest.fn }

  beforeEach(async () => {
    authSpy = { login: jest.fn() }
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(LoginComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call auth service on submit', () => {
    authSpy.login.mockReturnValue(of({ id: '1', email: 'test@wisp.sh' }))
    component.form.get('email')?.setValue('test@wisp.sh')
    component.form.get('password')?.setValue('password')
    component.onSubmit()
    expect(authSpy.login).toHaveBeenCalledWith('test@wisp.sh', 'password')
  })

  it('should set error on failed login', () => {
    authSpy.login.mockReturnValue(throwError(() => new Error('Invalid')))
    component.form.get('email')?.setValue('test@wisp.sh')
    component.form.get('password')?.setValue('password')
    component.onSubmit()
    expect(component.error()).toBe('Invalid')
  })
})
