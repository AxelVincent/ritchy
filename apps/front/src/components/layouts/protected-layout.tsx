import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AppSidebar } from '../sidebar/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb'
import { Separator } from '../ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../ui/sidebar'

export const ProtectedLayout = () => {
  useEffect(() => {
    // Initialize Sleekplan
    window.$sleek = []
    window.SLEEK_PRODUCT_ID = 26548954

    const script = document.createElement('script')
    script.src = 'https://client.sleekplan.com/sdk/e.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount
      document.head.removeChild(script)
      // biome-ignore lint/performance/noDelete: temporary for sleekplan script
      delete window.$sleek
      // biome-ignore lint/performance/noDelete: temporary for sleekplan script
      delete window.SLEEK_PRODUCT_ID
    }
  }, [])

  return (
    <>
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-full w-full overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        Building Your Application
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <Outlet />
            {/* <div className="flex flex-1">
              <div id="left-side" className="w-1/2 bg-gray-200">
                <p className="p-4">Left Side</p>
              </div>

              <div id="right-side" className="w-1/2 flex flex-col">
                <div id="row-1" className="h-[100px] bg-blue-200">
                  <p className="p-4">Row 1</p>
                </div>

                <div id="row-2" className="flex-1 overflow-auto bg-green-200">
                  <div className="w-full h-[100px] bg-red-200">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Donec nulla leo, porttitor eleifend orci ultrices, tempor
                    euismod nisl. Praesent gravida iaculis quam non commodo.
                    Vivamus vulputate molestie consectetur. Duis sed lacinia
                    nibh, sed convallis ligula. Vivamus dignissim sit amet metus
                    non molestie. Curabitur vel nibh eleifend, bibendum magna
                    vel, vehicula lectus. Cras eleifend nibh elit, sit amet
                    efficitur ex volutpat vel. In non fringilla elit, a rutrum
                    nibh. Donec id sem dolor. Aliquam dictum diam quis mi
                    rhoncus mollis. Phasellus faucibus turpis nunc, ac dapibus
                    diam aliquam ac. Phasellus nec finibus eros. Proin id purus
                    suscipit, faucibus neque elementum, sodales velit. Proin
                    quis turpis eu ex porta hendrerit vitae vitae lacus.
                    Suspendisse convallis massa vel consectetur ornare. Vivamus
                    vulputate molestie consectetur. Duis sed lacinia nibh, sed
                    convallis ligula. Vivamus dignissim sit amet metus non
                    molestie. Curabitur vel nibh eleifend, bibendum magna vel,
                    vehicula lectus. Cras eleifend nibh elit, sit amet efficitur
                    ex volutpat vel. In non fringilla elit, a rutrum nibh. Donec
                    id sem dolor. Aliquam dictum diam quis mi rhoncus mollis.
                    Phasellus faucibus turpis nunc, ac dapibus diam aliquam ac.
                    Phasellus nec finibus eros. Proin id purus suscipit,
                    faucibus neque elementum, sodales velit. Proin quis turpis
                    eu ex porta hendrerit vitae vitae lacus. Suspendisse
                    convallis massa vel consectetur ornare. Vivamus turpis
                    tellus, tempus placerat tristique id, scelerisque non nisi.
                    Cras maximus sagittis leo, a suscipit quam pharetra ut.
                    Interdum et malesuada fames ac ante ipsum primis in
                    faucibus. Phasellus sagittis at neque non aliquet. Nunc
                    faucibus metus eros, et aliquet nisl venenatis vel. Mauris
                    et ligula sapien. Donec suscipit, nunc vel molestie varius,
                    massa leo aliquam lacus, semper vehicula justo lorem non
                    nisi. Duis vehicula, orci et aliquet fermentum, dui lacus
                    luctus dui, ac suscipit tortor augue in est. Sed fermentum
                    odio turpis, non dignissim odio faucibus lacinia. Aliquam
                    erat volutpat. Cras fermentum consequat arcu nec fermentum.
                    Sed laoreet nibh diam, eget consectetur lacus volutpat eu.
                    Aliquam luctus est at ipsum tincidunt, fermentum efficitur
                    purus bibendum. Sed ultricies dolor vitae mi malesuada
                    placerat. Morbi justo neque, luctus sed massa eget,
                    sollicitudin interdum ex. Curabitur eu mollis arcu. Donec
                    hendrerit, augue nec pellentesque ornare, orci felis
                    scelerisque nibh, vitae placerat lacus justo at sapien.
                    Vestibulum ante ipsum primis in faucibus orci luctus et
                    ultrices posuere cubilia curae; Donec ac volutpat neque. Sed
                    egestas gravida ante ac congue. Nunc eget massa urna.
                    Vestibulum dignissim nisi at sapien tempus ultricies. Nulla
                    lacinia augue eleifend malesuada faucibus. Maecenas sit amet
                    condimentum turpis. Fusce vestibulum, arcu nec fringilla
                    imperdiet, risus mi tempus ante, quis laoreet nibh lacus et
                    ipsum. Donec in dignissim metus. Suspendisse potenti. Nam
                    sagittis tempus posuere. Pellentesque bibendum arcu turpis,
                    eu pharetra elit molestie quis. Nullam nulla odio, elementum
                    sit amet fringilla vel, tincidunt et libero. Nullam nec
                    libero ac sapien vulputate hendrerit id eget ex. Vestibulum
                    molestie ut dolor vitae pretium. Ut velit ipsum, tristique
                    vitae mi ut, aliquam euismod risus. Nullam orci ligula,
                    sodales id lorem ac, ornare convallis dolor. Aliquam at
                    varius libero. Aenean laoreet ultrices elit nec lobortis.
                    Aliquam erat volutpat. Vestibulum ut odio a erat maximus
                    pulvinar vitae nec nunc. Integer non nulla sed felis
                    tincidunt auctor. Suspendisse egestas tortor libero, non
                    sodales tellus mollis eget. Pellentesque leo nisi, aliquet
                    non enim ac, vulputate pharetra eros. Interdum et malesuada
                    fames ac ante ipsum primis in faucibus. Nullam vitae nulla
                    eu arcu convallis lobortis. Aenean lectus leo, vulputate id
                    mattis at, placerat placerat tellus. Nunc consectetur purus
                    a lorem tristique, a ultrices magna lacinia. Duis eros
                    metus, placerat interdum egestas vitae, dapibus quis arcu.
                    Pellentesque non ornare nisi. Nulla semper quam id risus
                    fringilla accumsan. Nullam metus diam, consequat non mollis
                    quis, hendrerit sit amet purus. Orci varius natoque
                    penatibus et magnis dis parturient montes, nascetur
                    ridiculus mus. Mauris in augue a ipsum tristique maximus.
                  </div>
                  {/* <div
                    id="big-content"
                    className="w-[3000px] h-[3000px] bg-red-200"
                  >
                    <p className="p-4">Big Content</p>
                  </div> */}
            {/* </div>

                <div id="row-3" className="h-[100px] bg-yellow-200">
                  <p className="p-4">Row 3</p>
                </div>
              </div>
            </div> */}
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>

      <SignedOut>
        <Navigate to="/" />
      </SignedOut>
    </>
  )
}
