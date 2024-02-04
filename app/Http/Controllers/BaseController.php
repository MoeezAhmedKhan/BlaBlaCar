<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class BaseController extends Controller
{
    public function home()
    {
        return view('index');
    }
    public function bus()
    {
        return view('bus');
    }
    public function carpool()
    {
        return view('carpool');
    }
}
